#!/usr/bin/env bash
# ==============================================================================
# Panoptext Visualiser (es-visualiser) - Automated 1-Command Installer
# Usage:
#   curl -sfL https://raw.githubusercontent.com/muduran-lgtm/es-visualiser/main/install.sh | sudo bash -
#
# Environment variables for custom installation:
#   INSTALL_DIR     Destination directory (default: /opt/panoptext-visualiser)
#   REPO_URL        Git repository URL (default: https://github.com/muduran-lgtm/es-visualiser.git)
#   BRANCH          Git branch (default: main)
#   SERVICE_NAME    Systemd service name (default: panoptext-visualiser)
#   SKIP_DEPS       Skip OS package installations (default: 0)
# ==============================================================================

set -eo pipefail

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# 1. Root Check
if [ "$(id -u)" -ne 0 ]; then
    log_error "This installer must be run as root (or with sudo)."
    echo -e "Try running: ${BOLD}curl -sfL https://raw.githubusercontent.com/muduran-lgtm/es-visualiser/main/install.sh | sudo bash -${NC}"
    exit 1
fi

INSTALL_DIR="${INSTALL_DIR:-/opt/panoptext-visualiser}"
REPO_URL="${REPO_URL:-https://github.com/muduran-lgtm/es-visualiser.git}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-panoptext-visualiser}"
SKIP_DEPS="${SKIP_DEPS:-0}"

echo -e "${BOLD}${BLUE}"
cat << "EOF"
  ____                               _            _   
 |  _ \ __ _ _ __   ___  _ __  _   _| |_ _____  _| |_ 
 | |_) / _` | '_ \ / _ \| '_ \| | | | __/ _ \ \/ / __|
 |  __/ (_| | | | | (_) | |_) | |_| | ||  __/>  <| |_ 
 |_|   \__,_|_| |_|\___/| .__/ \__, |\__\___/_/\_\\__|
                        |_|    |___/                  
   Elastic Workflows Visual Editor (es-visualiser)
EOF
echo -e "${NC}"
log_info "Target installation directory: ${BOLD}${INSTALL_DIR}${NC}"
log_info "Target service name: ${BOLD}${SERVICE_NAME}${NC}"

# 2. Check and Install OS Dependencies
install_dependencies() {
    log_info "Checking system requirements and dependencies..."

    local need_node=0
    if ! command -v node >/dev/null 2>&1; then
        need_node=1
    else
        NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$NODE_VER" -lt 20 ]; then
            log_warn "Current Node.js version (v$(node -v)) is outdated (v20+ required)."
            need_node=1
        fi
    fi

    if [ "$need_node" -eq 1 ] || ! command -v git >/dev/null 2>&1 || ! command -v openssl >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
        if [ "$SKIP_DEPS" -eq 1 ]; then
            log_warn "SKIP_DEPS is set, skipping automated OS package installation."
            return 0
        fi

        log_info "Installing missing dependencies (Git, OpenSSL, Node.js 22 LTS)..."

        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS_ID="${ID}"
            OS_LIKE="${ID_LIKE:-}"
        else
            OS_ID="unknown"
            OS_LIKE="unknown"
        fi

        if [[ "$OS_ID" =~ ^(debian|ubuntu|linuxmint|kali|pop)$ ]] || [[ "$OS_LIKE" =~ (debian|ubuntu) ]]; then
            export DEBIAN_FRONTEND=noninteractive
            apt-get update -y
            apt-get install -y ca-certificates curl gnupg git openssl
            if [ "$need_node" -eq 1 ]; then
                log_info "Configuring NodeSource repository for Node.js 22 LTS on Debian/Ubuntu..."
                mkdir -p /etc/apt/keyrings
                curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
                echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
                apt-get update -y
                apt-get install -y nodejs
            fi
        elif [[ "$OS_ID" =~ ^(rhel|centos|rocky|almalinux|fedora)$ ]] || [[ "$OS_LIKE" =~ (rhel|fedora) ]]; then
            PKG_MGR="dnf"
            command -v dnf >/dev/null 2>&1 || PKG_MGR="yum"
            $PKG_MGR install -y ca-certificates curl git openssl
            if [ "$need_node" -eq 1 ]; then
                log_info "Configuring NodeSource repository for Node.js 22 LTS on Enterprise Linux..."
                curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
                $PKG_MGR install -y nodejs
            fi
        elif [ "$OS_ID" = "alpine" ]; then
            apk update
            apk add --no-cache git openssl curl nodejs npm
        elif [ "$OS_ID" = "arch" ] || [[ "$OS_LIKE" =~ arch ]]; then
            pacman -Sy --noconfirm git openssl curl nodejs npm
        else
            log_warn "Unrecognized Linux distribution ($OS_ID). Please ensure Git, OpenSSL, and Node.js >= 20 are installed manually."
        fi
    fi

    # Verify Node and npm
    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        log_error "Node.js or npm could not be detected. Please install Node.js v20+ manually and re-run this script."
        exit 1
    fi

    log_success "Node.js $(node -v) and npm v$(npm -v) are ready."
}

install_dependencies

# 3. Clone or Update Repository
if [ -d "$INSTALL_DIR/.git" ]; then
    log_info "Existing repository detected in ${INSTALL_DIR}. Updating from ${BRANCH}..."
    git -C "$INSTALL_DIR" fetch origin "$BRANCH"
    git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
    log_success "Repository updated to latest commit."
else
    log_info "Cloning repository from ${REPO_URL} (${BRANCH})..."
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    log_success "Repository cloned successfully."
fi

cd "$INSTALL_DIR"

# 4. Initialize Configurations and Secrets
log_info "Setting up configuration files and self-signed TLS certificates..."

# A. .env file
if [ ! -f "$INSTALL_DIR/.env" ]; then
    if [ -f "$INSTALL_DIR/.env.example" ]; then
        cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
        log_success "Initialized .env from template."
    fi
fi

# B. server/data/connections.json
mkdir -p "$INSTALL_DIR/server/data"
if [ ! -f "$INSTALL_DIR/server/data/connections.json" ]; then
    if [ -f "$INSTALL_DIR/server/data/connections.example.json" ]; then
        cp "$INSTALL_DIR/server/data/connections.example.json" "$INSTALL_DIR/server/data/connections.json"
        log_success "Initialized server/data/connections.json from template."
    fi
fi

# C. server/data/users.json
if [ ! -f "$INSTALL_DIR/server/data/users.json" ]; then
    if [ -f "$INSTALL_DIR/server/data/users.example.json" ]; then
        cp "$INSTALL_DIR/server/data/users.example.json" "$INSTALL_DIR/server/data/users.json"
        log_success "Initialized server/data/users.json from template."
    fi
fi

# D. Self-Signed TLS Certificates (for HTTPS on 5173 & 3001)
mkdir -p "$INSTALL_DIR/certs"
if [ ! -f "$INSTALL_DIR/certs/cert.pem" ] || [ ! -f "$INSTALL_DIR/certs/key.pem" ]; then
    log_info "Generating self-signed TLS certificates (HTTPS)..."
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "$INSTALL_DIR/certs/key.pem" \
        -out "$INSTALL_DIR/certs/cert.pem" \
        -days 3650 \
        -subj "/CN=panoptext.visualiser/O=Panoptext/C=TR" >/dev/null 2>&1
    chmod 600 "$INSTALL_DIR/certs/key.pem"
    log_success "TLS certificates generated in ${INSTALL_DIR}/certs/"
fi

# 5. Install Dependencies and Build Application
log_info "Installing npm packages (this may take a minute)..."
npm install --silent

log_info "Building production bundles..."
npm run build

log_success "Application built successfully."

# 6. Setup Systemd Service
log_info "Configuring systemd service (${SERVICE_NAME})..."

NODE_BIN=$(which node)
NPM_BIN=$(which npm)

cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=Panoptext Visualiser (Elastic Workflows Visual Editor)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=${NPM_BIN} start
Restart=always
RestartSec=5
Environment=PATH=$(dirname "$NODE_BIN"):$(dirname "$NPM_BIN"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
Environment=NODE_ENV=development

[Install]
WantedBy=multi-user.target
EOF

# Optional alias es-visualiser.service if custom service name wasn't provided
if [ "$SERVICE_NAME" = "panoptext-visualiser" ]; then
    ln -sf "/etc/systemd/system/${SERVICE_NAME}.service" "/etc/systemd/system/es-visualiser.service"
fi

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1
systemctl restart "${SERVICE_NAME}"

log_success "Service ${SERVICE_NAME} started and enabled at boot."

# 7. Print Completion Banner
PRIMARY_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
PRIMARY_IP="${PRIMARY_IP:-localhost}"

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${BOLD}${GREEN}  Panoptext Visualiser (es-visualiser) Installed Successfully! 🚀${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo ""
echo -e "  🌐 ${BOLD}Web Interface:${NC}      https://${PRIMARY_IP}:5173"
echo -e "  ⚙️  ${BOLD}Service Status:${NC}     systemctl status ${SERVICE_NAME}"
echo -e "  📋 ${BOLD}Live Logs:${NC}          journalctl -u ${SERVICE_NAME} -f"
echo -e "  📁 ${BOLD}Install Directory:${NC}  ${INSTALL_DIR}"
echo ""
echo -e "  ${YELLOW}Note on HTTPS:${NC} A self-signed TLS certificate is used by default."
echo -e "  When opening the URL in your browser, click 'Advanced' -> 'Proceed to site'."
echo ""
echo -e "  🔄 ${BOLD}To update in the future, simply re-run:${NC}"
echo -e "  ${CYAN}curl -sfL https://raw.githubusercontent.com/muduran-lgtm/es-visualiser/main/install.sh | sudo bash -${NC}"
echo ""
echo -e "${GREEN}======================================================================${NC}"
echo ""
