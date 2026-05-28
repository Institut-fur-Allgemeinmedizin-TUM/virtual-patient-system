from sqlalchemy.orm import Session
from app.model.models import Role, DefaultRoles, User

def init_roles(db: Session) -> None:
    default_roles = [
        {"name": DefaultRoles.admin, "description": "Administrator with full access"},
        {"name": DefaultRoles.default, "description": "Default user role"},
        {"name": DefaultRoles.tum_user, "description": "Authenticated TUM user"},
        {"name": DefaultRoles.tester, "description": "Role for testing purposes"},
    ]
    
    for role_data in default_roles:
        role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not role:
            new_role = Role(**role_data)
            db.add(new_role)
    
    db.commit()

def init_anon_user(db: Session) -> None:
    """Ensure the anonymous user exists in the database if authentication is disabled."""
    anon_user = db.query(User).filter(User.oidc_id == "anon").first()
    if not anon_user:
        anon_user = User(oidc_id="anon")
        db.add(anon_user)
        
        # Assign default role
        default_role = db.query(Role).filter(Role.name == DefaultRoles.default).first()
        if default_role:
            anon_user.roles.append(default_role)
            
        db.commit()
