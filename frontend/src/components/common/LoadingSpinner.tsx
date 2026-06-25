import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface Props { message?: string; fullScreen?: boolean; }

export function LoadingSpinner({ message = 'Loading...', fullScreen = false }: Props) {
  return (
    <Box
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 2, ...(fullScreen ? { minHeight: '100vh' } : { py: 8 }),
      }}
    >
      <CircularProgress size={40} />
      {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
    </Box>
  );
}
