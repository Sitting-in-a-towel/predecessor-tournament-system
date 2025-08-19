#!/usr/bin/env node

/**
 * Log Viewer Utility
 * Reads and displays logs from all services for troubleshooting
 * Usage: node scripts/view-logs.js [options]
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');

const LOG_FILES = {
    phoenix: path.join(LOG_DIR, 'phoenix_draft.log'),
    backend: path.join(LOG_DIR, 'backend_api.log'),
    pubsub: path.join(LOG_DIR, 'pubsub_events.log'),
    errors: path.join(LOG_DIR, 'system_errors.log'),
    frontend: path.join(LOG_DIR, 'frontend_client.log')
};

// Color codes for better readability
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function formatTimestamp(timestamp) {
    return colorize(timestamp, 'cyan');
}

function formatService(service) {
    const serviceColors = {
        'PHOENIX': 'magenta',
        'BACKEND': 'green',
        'PUBSUB': 'yellow',
        'SYSTEM': 'red',
        'FRONTEND': 'blue'
    };
    return colorize(`[${service}]`, serviceColors[service] || 'white');
}

function formatLevel(level) {
    const levelColors = {
        'ERROR': 'red',
        'WARN': 'yellow',
        'INFO': 'green',
        'DEBUG': 'cyan'
    };
    return colorize(`[${level}]`, levelColors[level] || 'white');
}

function parseLine(line) {
    // Match pattern: [TIMESTAMP] [SERVICE] [LEVEL] [COMPONENT] MESSAGE
    const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)/);
    if (match) {
        const [, timestamp, service, level, component, message] = match;
        return {
            timestamp,
            service,
            level,
            component,
            message,
            raw: line
        };
    }
    return { raw: line };
}

function readLogFile(filePath, lines = 50) {
    try {
        if (!fs.existsSync(filePath)) {
            return [`Log file not found: ${filePath}`];
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const allLines = content.split('\n').filter(line => line.trim());
        
        // Return last N lines
        return allLines.slice(-lines);
    } catch (error) {
        return [`Error reading ${filePath}: ${error.message}`];
    }
}

function displayLogs(logType, lines = 50) {
    console.log(colorize(`\n=== ${logType.toUpperCase()} LOGS (last ${lines} lines) ===`, 'bright'));
    
    const filePath = LOG_FILES[logType];
    if (!filePath) {
        console.log(colorize('Unknown log type', 'red'));
        return;
    }
    
    const logLines = readLogFile(filePath, lines);
    
    logLines.forEach(line => {
        const parsed = parseLine(line);
        if (parsed.timestamp) {
            console.log(
                `${formatTimestamp(parsed.timestamp)} ${formatService(parsed.service)} ${formatLevel(parsed.level)} [${parsed.component}] ${parsed.message}`
            );
        } else {
            console.log(line);
        }
    });
}

function displayAllLogs(lines = 20) {
    Object.keys(LOG_FILES).forEach(logType => {
        displayLogs(logType, lines);
    });
}

function tailLogs(logType, interval = 2000) {
    console.log(colorize(`Tailing ${logType} logs (Ctrl+C to stop)...`, 'bright'));
    
    const filePath = LOG_FILES[logType];
    let lastSize = 0;
    
    if (fs.existsSync(filePath)) {
        lastSize = fs.statSync(filePath).size;
    }
    
    setInterval(() => {
        try {
            if (!fs.existsSync(filePath)) return;
            
            const currentSize = fs.statSync(filePath).size;
            if (currentSize > lastSize) {
                // Read new content
                const fd = fs.openSync(filePath, 'r');
                const buffer = Buffer.alloc(currentSize - lastSize);
                fs.readSync(fd, buffer, 0, currentSize - lastSize, lastSize);
                fs.closeSync(fd);
                
                const newContent = buffer.toString();
                const newLines = newContent.split('\n').filter(line => line.trim());
                
                newLines.forEach(line => {
                    const parsed = parseLine(line);
                    if (parsed.timestamp) {
                        console.log(
                            `${formatTimestamp(parsed.timestamp)} ${formatService(parsed.service)} ${formatLevel(parsed.level)} [${parsed.component}] ${parsed.message}`
                        );
                    } else {
                        console.log(line);
                    }
                });
                
                lastSize = currentSize;
            }
        } catch (error) {
            console.error('Error tailing log:', error.message);
        }
    }, interval);
}

function searchLogs(query, logType = 'all') {
    console.log(colorize(`\nSearching for "${query}" in ${logType} logs...`, 'bright'));
    
    const logsToSearch = logType === 'all' ? Object.keys(LOG_FILES) : [logType];
    
    logsToSearch.forEach(type => {
        const lines = readLogFile(LOG_FILES[type], 1000); // Search in last 1000 lines
        const matches = lines.filter(line => 
            line.toLowerCase().includes(query.toLowerCase())
        );
        
        if (matches.length > 0) {
            console.log(colorize(`\n--- ${type.toUpperCase()} (${matches.length} matches) ---`, 'yellow'));
            matches.forEach(line => {
                const parsed = parseLine(line);
                if (parsed.timestamp) {
                    console.log(
                        `${formatTimestamp(parsed.timestamp)} ${formatService(parsed.service)} ${formatLevel(parsed.level)} [${parsed.component}] ${parsed.message}`
                    );
                } else {
                    console.log(line);
                }
            });
        }
    });
}

function showHelp() {
    console.log(colorize('\nLog Viewer Utility', 'bright'));
    console.log('Usage: node scripts/view-logs.js [command] [options]\n');
    console.log('Commands:');
    console.log('  all [lines]           Show all logs (default: 20 lines each)');
    console.log('  phoenix [lines]       Show Phoenix draft logs');
    console.log('  backend [lines]       Show Backend API logs');
    console.log('  pubsub [lines]        Show PubSub event logs');
    console.log('  errors [lines]        Show system error logs');
    console.log('  frontend [lines]      Show frontend logs');
    console.log('  tail <logtype>        Tail logs in real-time');
    console.log('  search <query> [type] Search for text in logs');
    console.log('\nExamples:');
    console.log('  node scripts/view-logs.js all 50');
    console.log('  node scripts/view-logs.js phoenix');
    console.log('  node scripts/view-logs.js tail pubsub');
    console.log('  node scripts/view-logs.js search "draft_123"');
    console.log('  node scripts/view-logs.js search "error" errors');
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
        showHelp();
        return;
    }
    
    const command = args[0];
    
    switch (command) {
        case 'all':
            const allLines = parseInt(args[1]) || 20;
            displayAllLogs(allLines);
            break;
            
        case 'phoenix':
        case 'backend':
        case 'pubsub':
        case 'errors':
        case 'frontend':
            const lines = parseInt(args[1]) || 50;
            displayLogs(command, lines);
            break;
            
        case 'tail':
            const logType = args[1];
            if (!logType || !LOG_FILES[logType]) {
                console.log(colorize('Please specify a valid log type for tailing', 'red'));
                console.log('Available types:', Object.keys(LOG_FILES).join(', '));
                return;
            }
            tailLogs(logType);
            break;
            
        case 'search':
            const query = args[1];
            const searchType = args[2] || 'all';
            if (!query) {
                console.log(colorize('Please provide a search query', 'red'));
                return;
            }
            searchLogs(query, searchType);
            break;
            
        default:
            console.log(colorize(`Unknown command: ${command}`, 'red'));
            showHelp();
    }
}

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    console.log(colorize('Log directory not found. Please run the services first to generate logs.', 'yellow'));
    console.log(`Expected directory: ${LOG_DIR}`);
    process.exit(1);
}

main();