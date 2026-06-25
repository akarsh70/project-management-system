import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Link, InputAdornment, IconButton,
  Alert, Divider,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoginLoading, loginError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', bgcolor: 'background.default',
    }}>
      {/* Left decorative panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, width: '45%', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
        position: 'relative', overflow: 'hidden', p: 6,
      }}>
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.07)' }} />
        <Box sx={{ position: 'absolute', bottom: -100, left: -60, width: 350, height: 350, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 28 }}>P</Typography>
          </Box>
          <Typography variant="h3" fontWeight={900} color="#fff" sx={{ mb: 1.5, letterSpacing: -1 }}>ProjectHub</Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 400, maxWidth: 320 }}>
            Manage your projects, tasks, and teams — all in one place.
          </Typography>
          <Box sx={{ mt: 5, display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[['10+', 'Projects'], ['99%', 'Uptime'], ['24/7', 'Support']].map(([val, label]) => (
              <Box key={label} sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} color="#fff">{val}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right form panel */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 4 } }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>P</Typography>
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ProjectHub
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5, letterSpacing: -0.5 }}>Welcome back</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Sign in to your workspace</Typography>

          {loginError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {(loginError as any)?.response?.data?.error?.message || 'Invalid credentials'}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit((d) => login(d))} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              {...register('email')}
              label="Email address"
              type="email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
            />
            <TextField
              {...register('password')}
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isLoginLoading}
              sx={{ py: 1.5, fontWeight: 700, fontSize: 15, mt: 0.5 }}
            >
              {isLoginLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>OR</Typography>
          </Divider>
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" fontWeight={700} underline="hover">Create account</Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
