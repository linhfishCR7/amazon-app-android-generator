#!/bin/bash

# =============================================================================
# Cordova App Generator - Launch Script
# =============================================================================
# This script launches the Cordova App Generator web application
# with various server options and configuration checks.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_PORT=8080
APP_NAME="Cordova App Generator"
APP_VERSION="1.0.0"

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Show banner
show_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║               🚀 CORDOVA APP GENERATOR 🚀                   ║"
    echo "║                                                              ║"
    echo "║          Create Multiple Mobile Apps Instantly              ║"
    echo "║                    Version $APP_VERSION                           ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for web browsers
    if ! command -v google-chrome &> /dev/null && ! command -v firefox &> /dev/null && ! command -v safari &> /dev/null; then
        missing_tools+=("web browser (Chrome, Firefox, or Safari)")
    fi
    
    # Check for Node.js (optional but recommended)
    if ! command -v node &> /dev/null; then
        warning "Node.js not found. Some features may be limited."
    else
        local node_version=$(node --version)
        info "Node.js version: $node_version"
    fi
    
    # Check for Python (for simple HTTP server)
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        missing_tools+=("Python (for HTTP server)")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        echo ""
        echo "Please install the missing tools and try again."
        exit 1
    fi
    
    success "Prerequisites check completed ✓"
}

# Find available port
find_available_port() {
    local port=$DEFAULT_PORT
    
    while netstat -an 2>/dev/null | grep -q ":$port "; do
        ((port++))
        if [ $port -gt 9000 ]; then
            error "No available ports found in range 8080-9000"
            exit 1
        fi
    done
    
    echo $port
}

# Start Python HTTP server
start_python_server() {
    local port=$1
    
    if command -v python3 &> /dev/null; then
        info "Starting Python 3 HTTP server on port $port..."
        python3 -m http.server $port &
        return $!
    elif command -v python &> /dev/null; then
        info "Starting Python 2 HTTP server on port $port..."
        python -m SimpleHTTPServer $port &
        return $!
    else
        error "Python not found"
        return 1
    fi
}

# Start Node.js server
start_node_server() {
    local port=$1
    
    if command -v npx &> /dev/null; then
        info "Starting Node.js server on port $port..."
        npx serve -s . -l $port &
        return $!
    else
        return 1
    fi
}

# Start PHP server
start_php_server() {
    local port=$1
    
    if command -v php &> /dev/null; then
        info "Starting PHP server on port $port..."
        php -S localhost:$port &
        return $!
    else
        return 1
    fi
}

# Open browser
open_browser() {
    local url=$1
    
    info "Opening browser..."
    
    # Detect OS and open browser
    case "$(uname -s)" in
        Darwin)  # macOS
            open "$url"
            ;;
        Linux)
            if command -v xdg-open &> /dev/null; then
                xdg-open "$url"
            elif command -v google-chrome &> /dev/null; then
                google-chrome "$url"
            elif command -v firefox &> /dev/null; then
                firefox "$url"
            fi
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)  # Windows
            start "$url"
            ;;
        *)
            warning "Unable to detect OS. Please open $url manually."
            ;;
    esac
}

# Show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -p, --port PORT     Specify port number (default: $DEFAULT_PORT)"
    echo "  -s, --server TYPE   Server type: python|node|php (default: auto)"
    echo "  -b, --no-browser    Don't open browser automatically"
    echo "  -d, --demo          Launch demo page instead of main app"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Launch with default settings"
    echo "  $0 -p 3000          # Launch on port 3000"
    echo "  $0 -s node          # Use Node.js server"
    echo "  $0 --demo           # Launch demo page"
    echo "  $0 --no-browser     # Don't open browser"
}

# Main function
main() {
    local port=$DEFAULT_PORT
    local server_type="auto"
    local open_browser_flag=true
    local demo_mode=false
    local server_pid=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--port)
                port="$2"
                shift 2
                ;;
            -s|--server)
                server_type="$2"
                shift 2
                ;;
            -b|--no-browser)
                open_browser_flag=false
                shift
                ;;
            -d|--demo)
                demo_mode=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Show banner
    show_banner
    
    # Check prerequisites
    check_prerequisites
    
    # Find available port if default is taken
    if [ "$port" = "$DEFAULT_PORT" ]; then
        port=$(find_available_port)
        if [ "$port" != "$DEFAULT_PORT" ]; then
            warning "Port $DEFAULT_PORT is busy, using port $port instead"
        fi
    fi
    
    # Start server based on type
    case $server_type in
        python)
            server_pid=$(start_python_server $port)
            ;;
        node)
            server_pid=$(start_node_server $port)
            if [ $? -ne 0 ]; then
                warning "Node.js server failed, falling back to Python"
                server_pid=$(start_python_server $port)
            fi
            ;;
        php)
            server_pid=$(start_php_server $port)
            if [ $? -ne 0 ]; then
                warning "PHP server failed, falling back to Python"
                server_pid=$(start_python_server $port)
            fi
            ;;
        auto)
            # Try servers in order of preference
            server_pid=$(start_node_server $port)
            if [ $? -ne 0 ]; then
                server_pid=$(start_python_server $port)
                if [ $? -ne 0 ]; then
                    server_pid=$(start_php_server $port)
                    if [ $? -ne 0 ]; then
                        error "Failed to start any HTTP server"
                        exit 1
                    fi
                fi
            fi
            ;;
        *)
            error "Unknown server type: $server_type"
            exit 1
            ;;
    esac
    
    # Wait for server to start
    sleep 2
    
    # Determine URL
    local url="http://localhost:$port"
    if [ "$demo_mode" = true ]; then
        url="$url/examples/demo.html"
    fi
    
    # Show server info
    echo ""
    success "🎉 $APP_NAME is now running!"
    echo ""
    info "📍 Server URL: $url"
    info "🔧 Server PID: $server_pid"
    info "⏹️  Press Ctrl+C to stop the server"
    echo ""
    
    # Open browser
    if [ "$open_browser_flag" = true ]; then
        open_browser "$url"
        success "Browser opened ✓"
    else
        info "Browser not opened (--no-browser flag used)"
        info "Please open $url manually"
    fi
    
    echo ""
    log "Server is ready! 🚀"
    echo ""
    
    # Show helpful information
    echo -e "${CYAN}Quick Start Guide:${NC}"
    echo "1. Configure your GitHub username and package prefix"
    echo "2. Select app templates from the available options"
    echo "3. Click 'Generate All Apps' to create your applications"
    echo "4. View results and access your GitHub repositories"
    echo ""
    
    if [ "$demo_mode" = true ]; then
        echo -e "${CYAN}Demo Mode:${NC}"
        echo "You're viewing the demo page. Click 'Launch App Generator' to start creating apps."
        echo ""
    fi
    
    # Trap Ctrl+C to cleanup
    trap cleanup INT
    
    # Wait for server process
    if [ -n "$server_pid" ]; then
        wait $server_pid
    else
        # If we can't get PID, just wait indefinitely
        while true; do
            sleep 1
        done
    fi
}

# Cleanup function
cleanup() {
    echo ""
    log "Shutting down server..."
    
    # Kill server process
    if [ -n "$server_pid" ]; then
        kill $server_pid 2>/dev/null || true
    fi
    
    # Kill any remaining HTTP servers on our port
    pkill -f "http.server $port" 2>/dev/null || true
    pkill -f "SimpleHTTPServer $port" 2>/dev/null || true
    pkill -f "serve.*$port" 2>/dev/null || true
    pkill -f "php.*$port" 2>/dev/null || true
    
    success "Server stopped ✓"
    echo ""
    echo -e "${PURPLE}Thank you for using $APP_NAME! 🙏${NC}"
    echo ""
    exit 0
}

# Run main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
