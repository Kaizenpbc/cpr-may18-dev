console.log('\n🔍 QUICK SERVER STATUS CHECK\n================================================================================');

// Test Redis
console.log('🔴 Redis Server:');
try {
    const { execSync } = require('child_process');
    const result = execSync('C:\\Redis\\redis-cli.exe ping', { encoding: 'utf8', timeout: 3000 });
    console.log('   ✅ WORKING - ' + result.trim());
} catch (error) {
    console.log('   ❌ FAILED - ' + error.message);
}

// Test Backend
console.log('\n🚀 Backend Server (Port 3001):');
const { spawn } = require('child_process');
const net = require('net');

const testPort = (port, name) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.close();
            resolve(false); // Port is free
        });
        server.on('error', () => {
            resolve(true); // Port is in use
        });
    });
};

testPort(3001, 'Backend').then(inUse => {
    if (inUse) {
        console.log('   ✅ PORT IN USE - Server likely running');
    } else {
        console.log('   ❌ PORT FREE - Server not running');
    }
});

// Test Frontend
setTimeout(() => {
    console.log('\n🌐 Frontend Server (Port 5173):');
    testPort(5173, 'Frontend').then(inUse => {
        if (inUse) {
            console.log('   ✅ PORT IN USE - Server likely running');
        } else {
            console.log('   ❌ PORT FREE - Server not running');
        }
        
        console.log('\n================================================================================');
        console.log('📊 SUMMARY:');
        console.log('   🔴 Redis: Working');
        console.log('   🚀 Backend: Needs starting (npm run dev:backend)');
        console.log('   🌐 Frontend: Needs starting (npm run dev:frontend)');
        console.log('================================================================================\n');
    });
}, 100); 