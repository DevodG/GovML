"""
Helper Functions and Utilities
"""
import time
import asyncio
from typing import Callable, Any, Dict, List
from functools import wraps
import structlog

logger = structlog.get_logger(__name__)


def timing_decorator(func: Callable) -> Callable:
    """Decorator to measure function execution time"""
    
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.debug(
                f"Function {func.__name__} executed",
                execution_time=execution_time
            )
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"Function {func.__name__} failed",
                execution_time=execution_time,
                error=str(e)
            )
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.debug(
                f"Function {func.__name__} executed",
                execution_time=execution_time
            )
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"Function {func.__name__} failed",
                execution_time=execution_time,
                error=str(e)
            )
            raise
    
    return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper


def retry_decorator(max_retries: int = 3, delay: float = 1.0):
    """Decorator for retrying failed operations"""
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    logger.warning(
                        f"Attempt {attempt + 1} failed for {func.__name__}",
                        error=str(e)
                    )
                    
                    if attempt < max_retries - 1:
                        await asyncio.sleep(delay * (attempt + 1))
            
            logger.error(
                f"All {max_retries} attempts failed for {func.__name__}",
                error=str(last_exception)
            )
            raise last_exception
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    logger.warning(
                        f"Attempt {attempt + 1} failed for {func.__name__}",
                        error=str(e)
                    )
                    
                    if attempt < max_retries - 1:
                        time.sleep(delay * (attempt + 1))
            
            logger.error(
                f"All {max_retries} attempts failed for {func.__name__}",
                error=str(last_exception)
            )
            raise last_exception
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator


def batch_processor(items: List[Any], batch_size: int = 10) -> List[List[Any]]:
    """Split items into batches"""
    return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]


async def async_batch_processor(
    items: List[Any],
    process_func: Callable,
    batch_size: int = 10,
    max_concurrent: int = 5
) -> List[Any]:
    """Process items in batches asynchronously"""
    import asyncio
    
    semaphore = asyncio.Semaphore(max_concurrent)
    results = []
    
    async def process_item(item):
        async with semaphore:
            return await process_func(item)
    
    # Create tasks for all items
    tasks = [process_item(item) for item in items]
    
    # Process in batches
    for i in range(0, len(tasks), batch_size):
        batch = tasks[i:i + batch_size]
        batch_results = await asyncio.gather(*batch, return_exceptions=True)
        
        for result in batch_results:
            if isinstance(result, Exception):
                logger.error("Item processing failed", error=str(result))
                results.append(None)
            else:
                results.append(result)
    
    return results


def format_currency(amount: float, currency: str = "INR") -> str:
    """Format amount as currency"""
    if amount >= 1e7:  # Cr
        return f"{amount / 1e7:.2f} Cr"
    elif amount >= 1e5:  # L
        return f"{amount / 1e5:.2f} L"
    else:
        return f"{amount:,.2f}"


def format_percentage(value: float, decimals: int = 2) -> str:
    """Format value as percentage"""
    return f"{value * 100:.{decimals}f}%"


def format_timestamp(timestamp: str) -> str:
    """Format ISO timestamp to readable format"""
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return timestamp


def calculate_percentile(values: List[float], percentile: float) -> float:
    """Calculate percentile of values"""
    if not values:
        return 0.0
    
    sorted_values = sorted(values)
    n = len(sorted_values)
    index = int(percentile / 100 * n)
    
    return sorted_values[min(index, n - 1)]


def detect_outliers(values: List[float], threshold: float = 2.0) -> List[int]:
    """Detect outliers using z-score method"""
    if len(values) < 3:
        return []
    
    import numpy as np
    
    mean = np.mean(values)
    std = np.std(values)
    
    if std == 0:
        return []
    
    z_scores = [(x - mean) / std for x in values]
    outliers = [i for i, z in enumerate(z_scores) if abs(z) > threshold]
    
    return outliers


def normalize_score(score: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """Normalize score to specified range"""
    return max(min_val, min(max_val, (score - min_val) / (max_val - min_val)))


def weighted_average(values: List[float], weights: List[float]) -> float:
    """Calculate weighted average"""
    if not values or not weights or len(values) != len(weights):
        return 0.0
    
    total_weight = sum(weights)
    if total_weight == 0:
        return 0.0
    
    weighted_sum = sum(v * w for v, w in zip(values, weights))
    return weighted_sum / total_weight


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide numbers, returning default on division by zero"""
    if denominator == 0:
        return default
    return numerator / denominator


def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Truncate string to maximum length"""
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def merge_dicts(*dicts: Dict[str, Any]) -> Dict[str, Any]:
    """Merge multiple dictionaries"""
    result = {}
    for d in dicts:
        result.update(d)
    return result


def flatten_dict(d: Dict[str, Any], parent_key: str = "", sep: str = ".") -> Dict[str, Any]:
    """Flatten nested dictionary"""
    items = []
    
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    
    return dict(items)


def get_nested_value(d: Dict[str, Any], path: str, default: Any = None) -> Any:
    """Get value from nested dictionary using dot notation path"""
    keys = path.split('.')
    value = d
    
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return default
    
    return value


def is_valid_json(text: str) -> bool:
    """Check if text is valid JSON"""
    try:
        import json
        json.loads(text)
        return True
    except:
        return False


def parse_json_safely(text: str, default: Any = None) -> Any:
    """Parse JSON safely, returning default on failure"""
    try:
        import json
        return json.loads(text)
    except:
        return default
