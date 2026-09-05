import os
import sys
import subprocess
import time
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")


def kill_process_tree(proc):
    if proc and proc.poll() is None:
        try:
            if os.name == "nt":
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            else:
                proc.terminate()
        except Exception:
            pass


def main():
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"

    print("==================================================")
    print("IsItYou? - Biometric Verification Platform")
    print("==================================================")
    print("Starting FastAPI backend on http://127.0.0.1:8000")
    print("Starting Next.js frontend on http://localhost:3000")
    print("Press Ctrl+C to terminate both services.")
    print("==================================================\n")

    backend_cmd = [
        sys.executable, "-m", "uvicorn", "backend.main:app",
        "--host", "127.0.0.1",
        "--port", "8000",
        "--reload"
    ]
    backend_proc = subprocess.Popen(backend_cmd, cwd=ROOT_DIR)

    time.sleep(1.5)

    frontend_cmd = [npm_cmd, "run", "dev"]
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR)

    def shutdown(signum=None, frame=None):
        print("\nShutting down IsItYou? services...")
        kill_process_tree(backend_proc)
        kill_process_tree(frontend_proc)
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            if backend_proc.poll() is not None:
                print("\nBackend process stopped unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("\nFrontend process stopped unexpectedly.")
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        shutdown()


if __name__ == "__main__":
    main()
