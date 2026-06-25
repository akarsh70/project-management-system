import { ReactNode } from 'react';
import { Box, Typography, Breadcrumbs, Link, Divider } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface BreadcrumbItem { label: string; href?: string; }

interface Props {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: Props) {
  return (
    <Box sx={{ mb: 3.5 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="inherit" sx={{ fontSize: 14 }} />}
          sx={{ mb: 1.5 }}
        >
          {breadcrumbs.map((crumb, i) =>
            crumb.href ? (
              <Link key={i} href={crumb.href} underline="hover"
                sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}>
                {crumb.label}
              </Link>
            ) : (
              <Typography key={i} sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
                {crumb.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.2, letterSpacing: -0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ flexShrink: 0, pt: 0.5 }}>{actions}</Box>}
      </Box>
      <Divider sx={{ mt: 2.5, opacity: 0.5 }} />
    </Box>
  );
}
