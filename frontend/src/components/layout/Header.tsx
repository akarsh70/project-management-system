import {
  AppBar, Toolbar, IconButton, Tooltip, Badge, Box, Typography, Avatar, Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleSidebar, toggleNotificationDrawer, toggleTheme } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/helpers';

export function Header() {
  const dispatch = useAppDispatch();
  const { themeMode } = useAppSelector((s) => s.ui);
  const { unreadCount } = useAppSelector((s) => s.notifications);
  const user = useAppSelector((s) => s.auth.user);
  const { logout } = useAuth();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ gap: 0.5 }}>
        <IconButton
          edge="start"
          onClick={() => dispatch(toggleSidebar())}
          sx={{ mr: 1, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
        >
          <MenuIcon fontSize="small" />
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />

        {/* Notification bell */}
        <Tooltip title="Notifications">
          <IconButton
            onClick={() => dispatch(toggleNotificationDrawer())}
            sx={{ color: 'text.secondary', position: 'relative' }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18 } }}
            >
              <NotificationsOutlinedIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip title={themeMode === 'light' ? 'Dark mode' : 'Light mode'}>
          <IconButton
            onClick={() => dispatch(toggleTheme())}
            sx={{ color: 'text.secondary' }}
          >
            {themeMode === 'light'
              ? <DarkModeOutlinedIcon fontSize="small" />
              : <LightModeOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* User + Logout */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, ml: 1,
          pl: 1.5, borderLeft: '1px solid', borderColor: 'divider',
        }}>
          <Avatar sx={{
            width: 30, height: 30, fontSize: 12, fontWeight: 700,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          }}>
            {user ? getInitials(user.firstName, user.lastName) : 'U'}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', lineHeight: 1.2 }}>
              {user?.firstName}
            </Typography>
            <Chip
              label="Online"
              size="small"
              sx={{ height: 14, fontSize: 10, bgcolor: '#10B98115', color: '#10B981', fontWeight: 600,
                '& .MuiChip-label': { px: 0.8, py: 0 } }}
            />
          </Box>
          <Tooltip title="Logout">
            <IconButton onClick={() => logout()} size="small" sx={{ color: 'text.secondary', ml: 0.5 }}>
              <LogoutOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
