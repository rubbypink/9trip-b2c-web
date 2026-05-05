#!/usr/bin/env python3
"""
Color Migration Script for 9Trip B2C
Migrates hardcoded colors to design tokens
"""

import os
import re
from pathlib import Path

# Migration rules
MIGRATIONS = [
    # bg-white variants
    (r'className="([^"]*)bg-white([^"]*)"', r'className="\1bg-background\2"'),
    (r'className=\{`([^`]*)bg-white([^`]*)`\}', r'className={`\1bg-background\2`}'),
    
    # text-gray to semantic tokens
    (r'text-gray-400', 'text-gray-400'),  # Keep as is (gray token)
    (r'text-gray-500', 'text-gray-500'),  # Keep as is (gray token)
    (r'text-gray-600', 'text-foreground'),
    (r'text-gray-700', 'text-foreground'),
    (r'text-gray-800', 'text-foreground'),
    (r'text-gray-900', 'text-foreground'),
    
    # border-gray to border token
    (r'border-gray-100', 'border-border/50'),
    (r'border-gray-200', 'border-border'),
    (r'border-gray-300', 'border-border'),
    
    # bg-gray surface colors
    (r'bg-gray-50', 'bg-muted/5'),
    (r'bg-gray-100', 'bg-muted/10'),
    (r'bg-gray-200', 'bg-muted/20'),
    
    # blue to primary (remaining)
    (r'bg-blue-600', 'bg-primary-600'),
    (r'bg-blue-500', 'bg-primary-500'),
    (r'bg-blue-100', 'bg-primary-100'),
    (r'bg-blue-50', 'bg-primary-50'),
    (r'text-blue-600', 'text-primary-600'),
    (r'text-blue-500', 'text-primary-500'),
    (r'text-blue-400', 'text-primary-400'),
    (r'border-blue-500', 'border-primary-500'),
    (r'hover:bg-blue-700', 'hover:bg-primary-700'),
    (r'hover:text-blue-600', 'hover:text-primary-600'),
    (r'hover:text-blue-400', 'hover:text-primary-400'),
    
    # orange to secondary
    (r'text-orange-600', 'text-secondary-600'),
    (r'text-orange-500', 'text-secondary-500'),
    (r'bg-orange-500', 'bg-secondary-500'),
]

def migrate_file(filepath):
    """Migrate colors in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for pattern, replacement in MIGRATIONS:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    src_dir = Path("src/components")
    migrated_count = 0
    
    for ext in ['*.jsx', '*.js']:
        for filepath in src_dir.rglob(ext):
            if migrate_file(filepath):
                print(f"✅ Migrated: {filepath}")
                migrated_count += 1
    
    print(f"\n🎉 Total files migrated: {migrated_count}")

if __name__ == "__main__":
    main()
