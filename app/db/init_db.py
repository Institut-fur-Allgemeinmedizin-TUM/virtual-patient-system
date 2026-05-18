from sqlalchemy.orm import Session
from app.model.models import Role

def init_roles(db: Session) -> None:
    default_roles = [
        {"name": "Admin", "description": "Administrator with full access"},
        {"name": "Default", "description": "Default user role"},
        {"name": "Tester", "description": "Role for testing purposes"},
    ]
    
    for role_data in default_roles:
        role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not role:
            new_role = Role(**role_data)
            db.add(new_role)
    
    db.commit()
