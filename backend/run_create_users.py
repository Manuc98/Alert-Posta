#!/usr/bin/env python3
"""
Script para executar a criação de utilizadores iniciais
"""

import asyncio
import sys
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from scripts.create_super_admin import main

if __name__ == "__main__":
    print("🔑 Criando utilizadores iniciais do Alert@Postas...")
    asyncio.run(main())
