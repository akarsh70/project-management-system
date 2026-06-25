import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Link, Grid, Alert,
  InputAdornment, IconButton, Divider,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'At least 8 characters').max(50),
});
type FormData = z.infer<typeof schema>;

const FEATURES = ['Multi-tenant workspaces', 'Role-based access control', 'Real-time collaboration', 'Task & project tracking'];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { register: registerUser, isRegisterLoading, registerError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      {/* Left panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, width: '42%', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #4F46E5 0%, #7C3AED 60%, #DB2777 100%)',
        position: 'relative', overflow: 'hidden', p: 6,
      }}>
        <Box sx={{ position: 'absolute', top: -60, left: -60, width: 250, height: 250, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', bottom: -80, right: -40, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 24 }}>P</Typography>
            </Box>
            <Typography variant="h5" fontWeight={900} color="#fff">ProjectHub</Typography>
          </Box>
          <Typography variant="h4" fontWeight={800} color="#fff" sx={{ mb: 1, lineHeight: 1.2 }}>
            Everything you need to ship faster
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', mb: 4, lineHeight: 1.7 }}>
            Join teams building great products with ProjectHub.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {FEATURES.map((f) => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircleOutlineIcon sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{f}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right form */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 4 } }}>
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>P</Typography>
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ProjectHub
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5, letterSpacing: -0.5 }}>Create account</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Start managing projects with your team</Typography>

          {registerError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {(registerError as any)?.response?.data?.error?.message || 'Registration failed'}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit((d) => registerUser(d))} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  {...register('firstName')} label="First name" fullWidth
                  error={!!errors.firstName} helperText={errors.firstName?.message}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonOutlineIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField {...register('lastName')} label="Last name" fullWidth error={!!errors.lastName} helperText={errors.lastName?.message} />
              </Grid>
            </Grid>
            <TextField
              {...register('email')} label="Email address" type="email" fullWidth
              error={!!errors.email} helperText={errors.email?.message}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
            />
            <TextField
              {...register('password')} label="Password" fullWidth
              type={showPassword ? 'text' : 'password'}
              error={!!errors.password} helperText={errors.password?.message}
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
            <Button type="submit" variant="contained" size="large" fullWidth disabled={isRegisterLoading} sx={{ py: 1.5, fontWeight: 700, fontSize: 15, mt: 0.5 }}>
              {isRegisterLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>OR</Typography>
          </Divider>
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" fontWeight={700} underline="hover">Sign in</Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
