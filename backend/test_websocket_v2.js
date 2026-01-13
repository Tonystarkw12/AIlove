const WebSocket = require('ws');

// 从之前的登录响应中获取token
const LINA_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiOTlhMGJjOC01YWRhLTRjMTEtYmNjNS1lY2QxOGUxM2I5ZTAiLCJlbWFpbCI6ImxpbmFAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjgyOTMwMTUsImV4cCI6MTc2ODI5NjYxNX0.Kg9tIUM3wUaQ_I4zczILPIQbK7qNxVLYAIuOsmKbn5g';
const ZHANGWEI_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YjJhZjU3MC01ZDE0LTRhNjQtOGIzOS05NDc1YjgxNjc1N2UiLCJlbWFpbCI6InpoYW5nd2VpQGV4YW1wbGUuY29tIiwiaWF0IjoxNzY4Mjk0OTQ2LCJleHAiOjE3NjgyOTg1NDZ9.ExOpoX5Xhfjfin-XX_3p5S6k8c1zu6iaxfpmnJFVc2Q';

console.log('=== WebSocket 实时通知测试 V2 ===\n');

let linaConnected = false;
let zhangweiConnected = false;
let testComplete = false;

// 测试1: 两个用户都连接到WebSocket
console.log('步骤1: 连接两个用户到WebSocket服务器...\n');

// 李娜连接
const linaWs = new WebSocket(`ws://localhost:3000/ws/chat?token=${LINA_TOKEN}`);

linaWs.on('open', () => {
    console.log('✅ 李娜成功连接到WebSocket服务器');
    linaConnected = true;

    if (linaConnected && zhangweiConnected && !testComplete) {
        sendTestMessage();
    }
});

linaWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('📨 李娜收到消息:', JSON.stringify(msg, null, 2));

    if (msg.type === 'error') {
        console.error('❌ 错误:', msg.payload.message);
    }
});

linaWs.on('error', (error) => {
    console.error('❌ 李娜WebSocket错误:', error.message);
});

linaWs.on('close', () => {
    console.log('🔌 李娜连接关闭');
});

// 张伟连接
const zhangweiWs = new WebSocket(`ws://localhost:3000/ws/chat?token=${ZHANGWEI_TOKEN}`);

zhangweiWs.on('open', () => {
    console.log('✅ 张伟成功连接到WebSocket服务器');
    zhangweiConnected = true;

    if (linaConnected && zhangweiConnected && !testComplete) {
        sendTestMessage();
    }
});

zhangweiWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('📨 张伟收到消息:', JSON.stringify(msg, null, 2));

    if (msg.type === 'newMessage') {
        console.log('\n✅✅✅ WebSocket实时通知测试成功！');
        console.log('   - 消息ID:', msg.payload.messageId);
        console.log('   - 发送者ID:', msg.payload.senderId);
        console.log('   - 接收者ID:', msg.payload.receiverId);
        console.log('   - 消息内容:', msg.payload.content);
        console.log('   - 时间戳:', msg.payload.timestamp);

        testComplete = true;
        console.log('\n=== 测试完成，关闭连接 ===\n');
        setTimeout(() => {
            linaWs.close();
            zhangweiWs.close();
            process.exit(0);
        }, 1000);
    } else if (msg.type === 'error') {
        console.error('❌ 错误:', msg.payload.message);
    }
});

zhangweiWs.on('error', (error) => {
    console.error('❌ 张伟WebSocket错误:', error.message);
});

zhangweiWs.on('close', () => {
    console.log('🔌 张伟连接关闭');
});

// 发送测试消息
function sendTestMessage() {
    console.log('\n步骤2: 李娜向张伟发送实时消息...');
    const testMessage = {
        type: 'sendMessage',
        payload: {
            receiverId: '6b2af570-5d14-4a64-8b39-9475b816757e',
            content: '你好张伟！这是一条WebSocket实时消息测试'
        }
    };

    linaWs.send(JSON.stringify(testMessage));
    console.log('✅ 消息已发送，等待张伟接收...\n');
}

// 超时保护
setTimeout(() => {
    if (!testComplete) {
        console.log('\n⏰ 测试超时（15秒）');
        linaWs.close();
        zhangweiWs.close();
        process.exit(0);
    }
}, 15000);
