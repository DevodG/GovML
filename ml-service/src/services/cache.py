"""
Caching Service for ML Service
"""
import json
import time
import hashlib
from typing import Any, Optional, Dict
from pathlib import Path
import structlog

logger = structlog.get_logger(__name__)


class CacheService:
    """Simple in-memory cache with optional file persistence"""
    
    def __init__(self, ttl: int = 3600, persist_to_disk: bool = False):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl
        self.persist_to_disk = persist_to_disk
        self.cache_dir = Path("./cache")
        
        if self.persist_to_disk:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            self._load_from_disk()
    
    def _generate_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters"""
        key_data = f"{prefix}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, prefix: str, **kwargs) -> Optional[Any]:
        """Get value from cache"""
        key = self._generate_key(prefix, **kwargs)
        
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        
        # Check if expired
        if time.time() > entry['expires_at']:
            del self.cache[key]
            return None
        
        logger.debug("Cache hit", key=key)
        return entry['value']
    
    def set(self, prefix: str, value: Any, ttl: Optional[int] = None, **kwargs) -> None:
        """Set value in cache"""
        key = self._generate_key(prefix, **kwargs)
        cache_ttl = ttl or self.ttl
        
        self.cache[key] = {
            'value': value,
            'created_at': time.time(),
            'expires_at': time.time() + cache_ttl,
            'ttl': cache_ttl
        }
        
        logger.debug("Cache set", key=key, ttl=cache_ttl)
        
        if self.persist_to_disk:
            self._save_to_disk()
    
    def delete(self, prefix: str, **kwargs) -> bool:
        """Delete value from cache"""
        key = self._generate_key(prefix, **kwargs)
        
        if key in self.cache:
            del self.cache[key]
            logger.debug("Cache deleted", key=key)
            
            if self.persist_to_disk:
                self._save_to_disk()
            return True
        
        return False
    
    def clear(self) -> None:
        """Clear all cache entries"""
        self.cache.clear()
        logger.info("Cache cleared")
        
        if self.persist_to_disk:
            self._save_to_disk()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        now = time.time()
        total_entries = len(self.cache)
        expired_entries = sum(1 for entry in self.cache.values() if now > entry['expires_at'])
        valid_entries = total_entries - expired_entries
        
        return {
            'total_entries': total_entries,
            'valid_entries': valid_entries,
            'expired_entries': expired_entries,
            'ttl': self.ttl,
            'persist_to_disk': self.persist_to_disk
        }
    
    def _save_to_disk(self) -> None:
        """Save cache to disk"""
        try:
            cache_file = self.cache_dir / "cache.json"
            with open(cache_file, 'w') as f:
                json.dump(self.cache, f)
            logger.debug("Cache saved to disk")
        except Exception as e:
            logger.error("Failed to save cache to disk", error=str(e))
    
    def _load_from_disk(self) -> None:
        """Load cache from disk"""
        try:
            cache_file = self.cache_dir / "cache.json"
            if cache_file.exists():
                with open(cache_file, 'r') as f:
                    self.cache = json.load(f)
                logger.info("Cache loaded from disk", entries=len(self.cache))
        except Exception as e:
            logger.error("Failed to load cache from disk", error=str(e))
    
    def cleanup_expired(self) -> int:
        """Remove expired entries from cache"""
        now = time.time()
        expired_keys = [
            key for key, entry in self.cache.items()
            if now > entry['expires_at']
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.info("Cleaned up expired cache entries", count=len(expired_keys))
            
            if self.persist_to_disk:
                self._save_to_disk()
        
        return len(expired_keys)


# Global cache instance
cache_service = CacheService()
