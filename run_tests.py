import unittest
import sys
import os
import subprocess

if __name__ == "__main__":
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
    venv_python = (
        os.path.join(backend_dir, '.venv', 'bin', 'python')
        if os.name != 'nt'
        else os.path.join(backend_dir, '.venv', 'Scripts', 'python.exe')
    )

    # Automatically re-execute inside the backend virtual environment if available
    if os.path.exists(venv_python) and os.path.normcase(sys.executable) != os.path.normcase(venv_python):
        result = subprocess.run([venv_python] + sys.argv)
        sys.exit(result.returncode)

    # Add the backend directory to sys.path
    sys.path.insert(0, backend_dir)

    # Discover and run the tests in the backend/tests directory
    loader = unittest.TestLoader()
    suite = loader.discover(os.path.join(backend_dir, 'tests'))
    runner = unittest.TextTestRunner()
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)

