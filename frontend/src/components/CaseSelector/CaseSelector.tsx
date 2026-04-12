import { 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  CardActions, 
  Typography, 
  Button, 
  Box 
} from '@mui/material';
import { Case } from '@/types';

interface CaseSelectorProps {
  onCaseSelect: (caseId: string) => void;
  isLoading: boolean;
}

const cases: Case[] = [
  {
    id: 'bauchschmerzen',
    title: 'Bauchschmerzen',
    description: 'Herr Peter Lenz, 42 Jahre, LKW-Fahrer',
    image: '/patients/peter_lenz.png'
  },
  {
    id: 'brustschmerzen',
    title: 'Brustschmerzen',
    description: 'Herr Thomas Friedrich, 45 Jahre, Bürokaufmann',
    image: '/patients/thomas_friedrich.png'
  },
  {
    id: 'depression',
    title: 'Depression',
    description: 'Herr Johann Huber, 52 Jahre, Projektleiter',
    image: '/patients/johann_huber.png'
  },
  {
    id: 'dyspnoe',
    title: 'Dyspnoe',
    description: 'Frau Karin Seidel, 68 Jahre, Rentnerin',
    image: '/patients/karin_seidel.png'
  },
  {
    id: 'husten',
    title: 'Husten',
    description: 'Frau Sandra Müller, 39 Jahre, Grundschullehrerin',
    image: '/patients/sandra_mueller.png'
  },
  {
    id: 'kopfschmerzen',
    title: 'Kopfschmerzen',
    description: 'Herr Michael Bauer, 38 Jahre, Softwareentwickler',
    image: '/patients/michael_bauer.png'
  },
  {
    id: 'rueckenschmerzen',
    title: 'Rückenschmerzen',
    description: 'Herr Emin Yilmaz, 48 Jahre, Lagerarbeiter',
    image: '/patients/emin_yilmaz.png'
  }
];

export function CaseSelector({ onCaseSelect, isLoading }: CaseSelectorProps) {
  return (
    <Box>
      <Typography 
        variant="h5" 
        component="h2" 
        gutterBottom 
        align="center" 
        sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}
      >
        Wählen Sie einen Fall
      </Typography>
      
      <Grid container spacing={3}>
        {cases.map((case_) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={case_.id}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                }
              }}
              onClick={() => !isLoading && onCaseSelect(case_.id)}
            >
              <CardMedia
                component="img"
                height="240"
                image={case_.image}
                alt={`Portrait von ${case_.description}`}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography 
                  gutterBottom 
                  variant="h6" 
                  component="h3"
                  sx={{ fontWeight: 600 }}
                >
                  {case_.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                >
                  {case_.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button 
                  variant="contained" 
                  fullWidth
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCaseSelect(case_.id);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {isLoading ? 'Lädt...' : 'Fall starten'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          💡 Tipp: Führen Sie eine strukturierte Anamnese durch
          <br/>
          ⚠️ Dieser Chat basiert auf einem KI-Assistenten und wird nicht durch medizinisches Fachpersonal moderiert ⚠️
        </Typography>
      </Box>
    </Box>
  );
}

