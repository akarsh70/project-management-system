import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  themeMode: 'light' | 'dark';
  sidebarOpen: boolean;
  notificationDrawerOpen: boolean;
}

const savedTheme = (localStorage.getItem('themeMode') as 'light' | 'dark') || 'light';

const initialState: UiState = {
  themeMode: savedTheme,
  sidebarOpen: true,
  notificationDrawerOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', state.themeMode);
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.themeMode = action.payload;
      localStorage.setItem('themeMode', action.payload);
    },
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => { state.sidebarOpen = action.payload; },
    toggleNotificationDrawer: (state) => {
      state.notificationDrawerOpen = !state.notificationDrawerOpen;
    },
  },
});

export const {
  toggleTheme, setTheme, toggleSidebar, setSidebarOpen, toggleNotificationDrawer,
} = uiSlice.actions;
export default uiSlice.reducer;
