import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Chip,
  useTheme,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { LocalHospital, Logout, Person } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

export function Header() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      handleMenuClose();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to login
      navigate('/login');
    }
  };

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const displayName = user?.name || user?.email || 'User';
  
  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #0065BD 0%, #004A8F 100%)',
        borderBottom: `1px solid ${theme.palette.primary.light}`,
      }}
    >
      <Toolbar sx={{ py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <LocalHospital 
            sx={{ 
              mr: 2, 
              fontSize: 32,
              color: 'white',
              cursor: 'pointer'
            }}
            onClick={() => navigate("/")}
          />
          <Box
            sx={{cursor: 'pointer'}}
            onClick={() => navigate("/")}>
            <Typography 
              variant="h5" 
              component="h1"
              sx={{ 
                fontWeight: 700,
                color: 'white',
                letterSpacing: '-0.02em'
              }}
            >
              TUM Virtual Patient System
            </Typography>
            <Typography 
              variant="body2"
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 400,
                mt: 0.5
              }}
            >
              Medical Student Training Platform
            </Typography>
          </Box>
        </Box>
        
        <Chip
          icon={<LocalHospital sx={{ fontSize: 16 }} />}
          label="Powered by OpenAI GPT-4"
          variant="outlined"
          sx={{
            color: 'white',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            fontWeight: 500,
            mr: 2
          }}
        />

        {user && (
          <>
            <IconButton
              onClick={handleMenuOpen}
              sx={{
                ml: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1rem'
                }}
              >
                {getInitials(user.name, user.email)}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              sx={{ mt: 1 }}
            >
              <Box sx={{ px: 2, py: 1.5, minWidth: 250 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {user.name || 'TUM User'}
                </Typography>
                {user.tum_id && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                    TUM ID: {user.tum_id}
                  </Typography>
                )}
                {user.email && (
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                )}
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText>Abmelden</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

