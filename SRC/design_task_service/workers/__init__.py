"""
Workers package - Task execution workers.

This package contains workers for each generation_target type:
- BasicDesignWorker: Generates basic design from detail design
- SourceCodeWorker: Generates source code from basic design
- UnitTestWorker: Generates both UTD and UTC from source code
- UTCWorker: Generates UTC only from existing UTD
"""

from .base_worker import BaseWorker
from .basic_design_worker import BasicDesignWorker
from .source_code_worker import SourceCodeWorker
from .unit_test_worker import UnitTestWorker
from .utc_worker import UTCWorker

# Worker registry: generation_target -> Worker class
WORKER_REGISTRY = {
    "basic_design": BasicDesignWorker,
    "source_code": SourceCodeWorker,
    "unit_test": UnitTestWorker,
    "utc": UTCWorker,
}

__all__ = [
    "BaseWorker",
    "BasicDesignWorker",
    "SourceCodeWorker",
    "UnitTestWorker",
    "UTCWorker",
    "WORKER_REGISTRY",
]
