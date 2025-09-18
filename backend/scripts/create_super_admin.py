#!/usr/bin/env python3
"""
Script para criar o utilizador super_admin inicial
"""

import asyncio
import sys
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session, engine
from app.core.auth import get_password_hash
from app.models.user import User
from app.core.logging import get_logger

logger = get_logger("create_super_admin")


async def create_super_admin():
    """Criar utilizador super_admin inicial"""
    
    async with get_async_session() as db:
        try:
            # Verificar se já existe um super_admin
            from sqlalchemy import select
            result = await db.execute(
                select(User).where(User.role == "super_admin")
            )
            existing_super_admin = result.scalar_one_or_none()
            
            if existing_super_admin:
                logger.info("Super admin já existe", email=existing_super_admin.email)
                return existing_super_admin
            
            # Criar super_admin
            super_admin = User(
                email="admin@alertapostas.pt",
                username="super_admin",
                hashed_password=get_password_hash("Alert@Postas2025!"),
                full_name="Super Admin Alert@Postas",
                role="super_admin",
                is_active=True,
                is_verified=True
            )
            
            db.add(super_admin)
            await db.commit()
            await db.refresh(super_admin)
            
            logger.info("Super admin criado com sucesso", 
                       email=super_admin.email, 
                       id=super_admin.id)
            
            print("✅ Super Admin criado com sucesso!")
            print(f"📧 Email: {super_admin.email}")
            print(f"👤 Username: {super_admin.username}")
            print(f"🔑 Password: Alert@Postas2025!")
            print(f"🆔 ID: {super_admin.id}")
            
            return super_admin
            
        except Exception as e:
            logger.error("Erro ao criar super admin", error=str(e))
            await db.rollback()
            raise


async def create_developer_user():
    """Criar utilizador developer"""
    
    async with get_async_session() as db:
        try:
            # Verificar se já existe um developer
            from sqlalchemy import select
            result = await db.execute(
                select(User).where(User.role == "developer")
            )
            existing_developer = result.scalar_one_or_none()
            
            if existing_developer:
                logger.info("Developer já existe", email=existing_developer.email)
                return existing_developer
            
            # Criar developer
            developer = User(
                email="developer@alertapostas.pt",
                username="developer",
                hashed_password=get_password_hash("Dev@Postas2025!"),
                full_name="Developer Alert@Postas",
                role="developer",
                is_active=True,
                is_verified=True
            )
            
            db.add(developer)
            await db.commit()
            await db.refresh(developer)
            
            logger.info("Developer criado com sucesso", 
                       email=developer.email, 
                       id=developer.id)
            
            print("✅ Developer criado com sucesso!")
            print(f"📧 Email: {developer.email}")
            print(f"👤 Username: {developer.username}")
            print(f"🔑 Password: Dev@Postas2025!")
            print(f"🆔 ID: {developer.id}")
            
            return developer
            
        except Exception as e:
            logger.error("Erro ao criar developer", error=str(e))
            await db.rollback()
            raise


async def main():
    """Função principal"""
    print("🚀 Criando utilizadores iniciais do Alert@Postas...")
    print()
    
    try:
        # Criar super admin
        await create_super_admin()
        print()
        
        # Criar developer
        await create_developer_user()
        print()
        
        print("🎉 Todos os utilizadores criados com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
