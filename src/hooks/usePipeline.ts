import { useState, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { Pipeline } from '../types';
import { isTauri } from '../utils/platform';

export const usePipeline = () => {
  const [currentPipeline, setCurrentPipeline] = useState<Pipeline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // LocalStorage用のヘルパー関数
  const saveToLocalStorage = (pipeline: Pipeline, name: string) => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved-pipelines') || '{}');
      saved[name] = pipeline;
      localStorage.setItem('saved-pipelines', JSON.stringify(saved));
      return true;
    } catch {
      return false;
    }
  };

  const loadFromLocalStorage = (name: string): Pipeline | null => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved-pipelines') || '{}');
      return saved[name] || null;
    } catch {
      return null;
    }
  };

  const listFromLocalStorage = (): string[] => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved-pipelines') || '{}');
      return Object.keys(saved);
    } catch {
      return [];
    }
  };

  const savePipeline = useCallback(async (
    nodes: Node[],
    edges: Edge[],
    name: string,
    description?: string,
    path?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const pipeline: Pipeline = {
        id: currentPipeline?.id || Date.now().toString(),
        name,
        description,
        nodes: nodes as any,
        edges: edges as any,
        createdAt: currentPipeline?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (isTauri()) {
        // Tauriアプリではファイルダイアログを使用
        const { save } = await import('@tauri-apps/plugin-dialog');
        
        const filePath = await save({
          filters: [{
            name: 'Pipeline Files',
            extensions: ['json']
          }],
          defaultPath: `${name}.json`
        });

        if (filePath) {
          const { writeFile } = await import('@tauri-apps/plugin-fs');
          const json = JSON.stringify(pipeline, null, 2);
          console.log('Saving to:', filePath);
          console.log('Content:', json);
          try {
            const encoder = new TextEncoder();
            const data = encoder.encode(json);
            await writeFile(filePath, data);
            console.log('File saved successfully');
            setCurrentPipeline(pipeline);
          } catch (writeError) {
            console.error('Error writing file:', writeError);
            throw writeError;
          }
        }
      } else {
        // ブラウザではLocalStorageを使用
        if (saveToLocalStorage(pipeline, name)) {
          setCurrentPipeline(pipeline);
        } else {
          throw new Error('Failed to save to LocalStorage');
        }
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  }, [currentPipeline]);

  const loadPipeline = useCallback(async (path?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isTauri()) {
        let filePath = path;
        
        // パスが指定されていない場合、ファイルダイアログを開く
        if (!filePath) {
          const { open } = await import('@tauri-apps/plugin-dialog');
          filePath = await open({
            filters: [{
              name: 'Pipeline Files',
              extensions: ['json']
            }]
          });
        }

        if (filePath) {
          const { readFile } = await import('@tauri-apps/plugin-fs');
          console.log('Reading from:', filePath);
          try {
            const data = await readFile(filePath as string);
            const decoder = new TextDecoder();
            const content = decoder.decode(data);
            console.log('File content:', content);
            const pipeline: Pipeline = JSON.parse(content);
            setCurrentPipeline(pipeline);
            return pipeline;
          } catch (readError) {
            console.error('Error reading file:', readError);
            throw readError;
          }
        }
      } else {
        // ブラウザではLocalStorageから読み込み
        if (path) {
          const pipeline = loadFromLocalStorage(path);
          if (pipeline) {
            setCurrentPipeline(pipeline);
            return pipeline;
          } else {
            throw new Error('Pipeline not found in LocalStorage');
          }
        }
      }
      
      return null;
    } catch (err) {
      setError(err as string);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listPipelines = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // ブラウザではLocalStorageから一覧を取得
      // Tauriアプリではファイルダイアログを使用するため、この関数は不要
      return listFromLocalStorage();
    } catch (err) {
      setError(err as string);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const newPipeline = useCallback(() => {
    setCurrentPipeline(null);
  }, []);

  return {
    currentPipeline,
    savePipeline,
    loadPipeline,
    listPipelines,
    newPipeline,
    isLoading,
    error,
  };
};