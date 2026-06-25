import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Avatar, Tooltip, Badge,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useAppSelector } from '../../store';
import { OrgSwitcher } from './OrgSwitcher';
import { getInitials } from '../../utils/helpers';

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/dashboard' },
  { label: 'Projects', icon: <FolderOpenIcon fontSize="small" />, path: '/projects' },
  { label: 'My Tasks', icon: <TaskAltIcon fontSize="small" />, path: '/tasks' },
  { label: 'Members', icon: <GroupsOutlinedIcon fontSize="small" />, path: '/members' },
  { label: 'Billing', icon: <CreditCardOutlinedIcon fontSize="small" />, path: '/billing' },
  { label: 'Profile', icon: <PersonOutlineIcon fontSize="small" />, path: '/profile' },
  { label: 'Settings', icon: <SettingsOutlinedIcon fontSize="small" />, path: '/settings' },
];

interface SidebarProps { width: number; }

export function Sidebar({ width }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const user = useAppSelector((s) => s.auth.user);

  return (
    <Drawer
      variant="persistent"
      open={sidebarOpen}
      sx={{
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 2.5, pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>P</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}>
              ProjectHub
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Workspace</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 1.5, pb: 1 }}>
        <OrgSwitcher />
      </Box>

      <Divider sx={{ mx: 2, opacity: 0.5 }} />

      {/* Nav */}
      <List sx={{ px: 1.5, pt: 1.5, flexGrow: 1 }}>
        <Typography variant="caption" color="text.disabled" sx={{ px: 1, pb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, fontWeight: 700 }}>
          Menu
        </Typography>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                    borderLeft: '3px solid #6366F1',
                    pl: '13px',
                    '& .MuiListItemIcon-root': { color: '#6366F1' },
                    '& .MuiListItemText-primary': { color: '#6366F1', fontWeight: 700 },
                    '&:hover': { background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* User footer */}
      <Divider sx={{ mx: 2, opacity: 0.5 }} />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={<Box sx={{ width: 9, height: 9, bgcolor: '#10B981', border: '2px solid', borderColor: 'background.paper', borderRadius: '50%' }} />}
        >
          <Avatar sx={{
            width: 38, height: 38, fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          }}>
            {user ? getInitials(user.firstName, user.lastName) : 'U'}
          </Avatar>
        </Badge>
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.3 }}>
            {user ? `${user.firstName} ${user.lastName}` : 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
            {user?.email}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
