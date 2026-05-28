from sqlalchemy.orm import Session
from app.model.models import Role, DefaultRoles

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
