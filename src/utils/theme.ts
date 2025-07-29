import { lightTheme, darkTheme, ThemeType } from '../styles/theme';

export const getTheme = (isDark: boolean): ThemeType => {
  return isDark ? darkTheme : lightTheme;
};