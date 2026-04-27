import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Alert, 
  CircularProgress,
  List,
  Paper,
  Snackbar
} from '@mui/material';
import { ChatBubbleOutline, Lightbulb, Person } from '@mui/icons-material';
import { Message, CaseDetails, Evaluation } from '@/types';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { SessionInfo } from '@/components/SessionInfo';
import { EvaluationDialog } from '@/components/EvaluationDialog';
import { apiClient } from '@/lib/api';

// Use same API URL logic as api.ts
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return window.location.origin;
  }
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

interface ChatInterfaceProps {
  sessionId: string;
  caseId: string;
  onReset: () => void;
}

const CASE_TITLES: Record<string, string> = {
  bauchschmerzen: 'Bauchschmerzen',
  brustschmerzen: 'Brustschmerzen',
  depression: 'Depression',
  dyspnoe: 'Dyspnoe',
  husten: 'Husten',
  kopfschmerzen: 'Kopfschmerzen',
  rueckenschmerzen: 'Rückenschmerzen',
};

export function ChatInterface({ sessionId, caseId, onReset }: ChatInterfaceProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate user message count
  const userMessageCount = messages.filter(m => m.role === 'user').length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Fetch case details when component mounts
    const fetchCaseDetails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCaseDetails(data);
        }
      } catch (error) {
        console.error('Error fetching case details:', error);
      }
    };

    fetchCaseDetails();
  }, [caseId]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          session_id: sessionId,
          message: content.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCaseTitle = (caseId: string) => {
    return CASE_TITLES[caseId] || caseId;
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setEvaluationError(null);

    try {
      const result = await apiClient.evaluateSession(sessionId);
      setEvaluation(result);
      setShowEvaluationDialog(true);
    } catch (error) {
      console.error('Error evaluating session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Evaluation fehlgeschlagen';
      setEvaluationError(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCloseEvaluation = () => {
    setShowEvaluationDialog(false);
    // Navigate back to case selection
    navigate('/');
  };

  const handleLiveTranscript = (role: 'user' | 'assistant', content: string) => {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return;
    }

    const transcriptMessage: Message = {
      id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      role,
      content: normalizedContent,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => {
      if (role === 'assistant' && prev.length > 0) {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.role === 'assistant') {
          const separator = lastMessage.content.endsWith(' ') ? '' : ' ';
          const mergedMessage: Message = {
            ...lastMessage,
            content: `${lastMessage.content}${separator}${normalizedContent}`,
            timestamp: transcriptMessage.timestamp,
          };

          return [...prev.slice(0, -1), mergedMessage];
        }
      }

      return [...prev, transcriptMessage];
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SessionInfo 
        caseTitle={getCaseTitle(caseId)}
        sessionId={sessionId}
        messageCount={userMessageCount}
        onReset={onReset}
        onEvaluate={handleEvaluate}
        isEvaluating={isEvaluating}
      />
      
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          p: 3,
          backgroundColor: 'grey.50'
        }}
      >
        {messages.length === 0 && (
          <Box 
            sx={{ 
              textAlign: 'center', 
              py: 6,
              px: 3
            }}
          >
            <ChatBubbleOutline 
              sx={{ 
                fontSize: 48, 
                color: 'primary.main',
                mb: 2
              }} 
            />
            <Typography 
              variant="h6" 
              color="text.primary"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Gespräch gestartet!
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Beginnen Sie mit einer freundlichen Begrüßung und führen Sie eine strukturierte Anamnese durch.
            </Typography>
            
            {/* Patient Information Card */}
            {caseDetails && (
              <Paper 
                elevation={0}
                sx={{ 
                  mt: 3,
                  p: 2.5,
                  backgroundColor: 'primary.lighter',
                  border: 1,
                  borderColor: 'primary.light',
                  maxWidth: 500,
                  mx: 'auto',
                  mb: 3
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Person sx={{ fontSize: 24, color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                    Patient:in
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body1" color="text.primary" sx={{ mb: 0.5 }}>
                    <strong>Name:</strong> {caseDetails.patient_name}
                  </Typography>
                  <Typography variant="body1" color="text.primary" sx={{ mb: 0.5 }}>
                    <strong>Alter:</strong> {caseDetails.patient_age} Jahre
                  </Typography>
                  <Typography variant="body1" color="text.primary">
                    <strong>Beruf:</strong> {caseDetails.patient_occupation}
                  </Typography>
                </Box>
              </Paper>
            )}
            
            {/* General Communication Tips */}
            <Paper 
              elevation={0}
              sx={{ 
                mt: 3,
                p: 2.5,
                backgroundColor: 'info.lighter',
                border: 1,
                borderColor: 'info.light',
                maxWidth: 500,
                mx: 'auto'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Lightbulb sx={{ fontSize: 20, color: 'warning.main' }} />
                <Typography variant="subtitle2" fontWeight={600}>
                  Tipps für ein gutes Gespräch:
                </Typography>
              </Box>
              <List sx={{ listStyleType: 'disc', pl: 4, textAlign: 'left' }}>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ display: 'list-item', mb: 0.5, textAlign: 'left' }}>
                Beginnen Sie mit offenen Fragen, damit die Patientin oder der Patient die Beschwerden in eigenen Worten schildern kann.
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ display: 'list-item', mb: 0.5, textAlign: 'left' }}>
                Hören Sie aktiv zu und gehen Sie auf das Gesagte ein, bevor Sie gezielter nachfragen.
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ display: 'list-item', mb: 0.5, textAlign: 'left' }}>
                Strukturieren Sie Ihr Gespräch klar, um sicherzustellen, dass Sie keine wichtigen Punkte auslassen.
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ display: 'list-item', mb: 0.5, textAlign: 'left' }}>
                Stellen Sie präzise Nachfragen, wenn Ihnen etwas unklar ist oder Sie Symptome genauer eingrenzen möchten.
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ display: 'list-item', mb: 0.5, textAlign: 'left' }}>
                Überlegen Sie während des Gesprächs: Welche Informationen benötige ich, um mir ein vollständiges Bild zu machen?
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ display: 'list-item', mb: 0.5, textAlign: 'left' }}>
                Sichern Sie Ihr Verständnis, indem Sie gelegentlich zusammenfassen oder wiederholen, was Sie gehört haben.
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ display: 'list-item', textAlign: 'left' }}>
                Beenden Sie das Gespräch, indem Sie die wichtigsten Punkte noch einmal kurz zusammenfassen.
                </Typography>
              </List>
            </Paper>
          </Box>
        )}
        
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Paper 
              elevation={1}
              sx={{ 
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Patient antwortet...
              </Typography>
            </Paper>
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <div ref={messagesEndRef} />
      </Box>
      
      <ChatInput
        sessionId={sessionId}
        onSendMessage={sendMessage}
        onLiveTranscript={handleLiveTranscript}
        disabled={isLoading}
      />

      {/* Evaluation Dialog */}
      <EvaluationDialog
        open={showEvaluationDialog}
        evaluation={evaluation}
        onClose={handleCloseEvaluation}
      />

      {/* Evaluation Error Snackbar */}
      <Snackbar
        open={!!evaluationError}
        autoHideDuration={6000}
        onClose={() => setEvaluationError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setEvaluationError(null)} sx={{ width: '100%' }}>
          {evaluationError}
        </Alert>
      </Snackbar>
    </Box>
  );
}

