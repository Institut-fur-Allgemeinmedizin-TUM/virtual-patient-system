import os
from typing import Optional
from dotenv import load_dotenv


class Settings:
    def __init__(self) -> None:
        load_dotenv()
        # Minimal settings for MVP; load from environment
        self.environment: str = os.getenv("ENVIRONMENT", "development")
        self.port: int = int(os.getenv("PORT", "8000"))
        self.openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
        self.openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        # OIDC (TUM) configuration
        self.oidc_issuer: Optional[str] = os.getenv("OIDC_ISSUER")
        self.oidc_client_id: Optional[str] = os.getenv("OIDC_CLIENT_ID")
        self.oidc_client_secret: Optional[str] = os.getenv("OIDC_CLIENT_SECRET")
        self.oidc_auth_url: Optional[str] = os.getenv("OIDC_AUTH_URL")
        self.oidc_token_url: Optional[str] = os.getenv("OIDC_TOKEN_URL")
        self.oidc_jwks_url: Optional[str] = os.getenv("OIDC_JWKS_URL")
        self.oidc_redirect_uri: Optional[str] = os.getenv("OIDC_REDIRECT_URI")
        # App/session
        self.app_secret_key: str = os.getenv("APP_SECRET_KEY", "dev-secret-change-me")
        self.require_auth: bool = os.getenv("REQUIRE_AUTH", "false").lower() == "true"
        self.frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
        # VHB (external) login
        self.vhb_password: Optional[str] = os.getenv("VHB_PASSWORD")
        # Database URL (will be constructed for Cloud SQL in production)
        self.database_url: str = self._get_database_url()
    
    def _get_database_url(self) -> str:
        """
        Get database URL, handling both local and Cloud SQL connections.
        In production on Cloud Run, this uses Unix socket connection to Cloud SQL.
        """
        # Check if DATABASE_URL is explicitly set
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            return db_url
        
        # In production with Cloud SQL, construct Unix socket connection
        if self.environment == "production":
            instance_connection_name = os.getenv("CLOUD_SQL_CONNECTION_NAME")
            db_user = os.getenv("DB_USER", "postgres")
            db_password = os.getenv("DB_PASSWORD", "")
            db_name = os.getenv("DB_NAME", "virtual-patient-db")
            
            if instance_connection_name:
                # Cloud SQL Unix socket path
                db_socket_dir = "/cloudsql"
                return f"postgresql+psycopg://{db_user}:{db_password}@/{db_name}?host={db_socket_dir}/{instance_connection_name}"
        
        # Default to local PostgreSQL
        return "postgresql+psycopg://localhost/vpatient"


settings = Settings()


