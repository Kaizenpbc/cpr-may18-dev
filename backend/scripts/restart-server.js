import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function killPort(port) {
    try {
        console.log(`\n🔍 Checking for processes on port ${port}...`);
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.split('\n');
        
        for (const line of lines) {
            if (line.includes('LISTENING')) {
                const pid = line.trim().split(/\s+/).pop();
                if (pid) {
                    console.log(`\n🛑 Found process ${pid} on port ${port}`);
                    console.log(`\n💥 Killing process ${pid}...`);
                    await execAsync(`taskkill /F /PID ${pid}`);
                    console.log(`\n✅ Successfully killed process ${pid}`);
                }
            }
        }
    } catch (error) {
        console.log(`\nℹ️ No process found on port ${port}`);
    }
}

async function restartServer() {
    const port = process.env.PORT || 3001;
    
    console.log('\n🔄 Starting server restart process...');
    console.log('\n⏳ Waiting for 2 seconds to ensure clean shutdown...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await killPort(port);
    
    console.log('\n🚀 Starting server...');
    console.log('\n📝 Server logs will appear below:');
    console.log('='.repeat(80));
    
    // Start the server using tsx watch
    const server = exec('npx tsx watch src/index.ts', {
        env: { ...process.env, FORCE_COLOR: 'true' }
    });
    
    server.stdout.on('data', (data) => {
        process.stdout.write(data);
    });
    
    server.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    server.on('error', (error) => {
        console.error('\n❌ Server failed to start:', error);
        process.exit(1);
    });

    server.on('exit', (code) => {
        if (code !== 0) {
            console.error(`\n❌ Server exited with code ${code}`);
            process.exit(code);
        }
    });
}

console.log('\n🔄 Server restart script initialized');
restartServer(); 