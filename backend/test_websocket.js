const WebSocket = require('ws');

// 从之前的登录响应中获取李娜的token
const LINA_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiOTlhMGJjOC01YWRhLTRjMTEtYmNjNS1lY2QxOGUxM2I5ZTAiLCJlbWFpbCI6ImxpbmFAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjgyOTMwMTUsImV4cCI6MTc2ODI5NjYxNX0.Kg9tIUM3wUaQ_I4zczILPIQbK7qNxVLYAIuOsmKbn5g';

// 张伟的token（用于接收方）
const ZHANGWEI_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YjJhZjU3MC01ZDE0LTRhNjQtOGIzOS05NDc1YjgxNjc1N2UiLCJlbWFpbCI6InpoYW5nd2VpQGV4YW1wbGUuY29tIiwiaWF0IjoxNzY4Mjk0OTQ2LCJleHAiOjE3NjgyOTg1NDZ9.ExOpoX5Xhfjfin-XX_3p5S6k8c1zu6iaxfpmnJFVc2Q';

console.log('=== WebSocket 实时通知测试 ===\n');

// 测试1: 李娜连接WebSocket
console.log('测试1: 李娜连接到WebSocket服务器...');
const ws1 = new WebSocket(`ws://localhost:3000/ws/chat?token=${LINA_TOKEN}`);

ws1.on('open', () => {
    console.log('✅ 李娜成功连接到WebSocket服务器\n');

    // 测试2: 发送消息给张伟
    console.log('测试2: 李娜发送消息给张伟...');
    const testMessage = {
        type: 'sendMessage',
        payload: {
            receiverId: '6b2af570-5d14-4a64-8b39-9475b816757e', // 张伟的ID
            content: '你好！这是一条WebSocket测试消息'
        }
    };

    ws1.send(JSON.stringify(testMessage));
    console.log('✅ 消息已发送\n');
});

ws1.on('message', (data) => {
    console.log('📨 李娜收到消息:', data.toString());
    const msg = JSON.parse(data.toString());
    if (msg.type === 'newMessage') {
        console.log('✅ 收到新消息通知');
        console.log('   发送者ID:', msg.payload.senderId);
        console.log('   消息内容:', msg.payload.content);
        console.log('   时间戳:', msg.payload.timestamp);
    }
});

ws1.on('error', (error) => {
    console.error('❌ WebSocket连接错误:', error.message);
});

ws1.on('close', (code, reason) => {
    console.log(`🔌 李娜连接关闭: code=${code}, reason=${reason}\n`);
});

// 测试3: 张伟也连接WebSocket（模拟接收方）
setTimeout(() => {
    console.log('测试3: 张伟连接到WebSocket服务器...');
    const ws2 = new WebSocket(`ws://localhost:3000/ws/chat?token=${ZHANGWEI_TOKEN}`);

    ws2.on('open', () => {
        console.log('✅ 张伟成功连接到WebSocket服务器\n');
    });

    ws2.on('message', (data) => {
        console.log('📨 张伟收到消息:', data.toString());
        const msg = JSON.parse(data.toString());
        if (msg.type === 'newMessage') {
            console.log('✅ 张伟收到来自李娜的消息！');
            console.log('   消息ID:', msg.payload.messageId);
            console.log('   发送者ID:', msg.payload.senderId);
            console.log('   消息内容:', msg.payload.content);
            console.log('   时间戳:', msg.payload.timestamp);

            // 所有测试完成
            console.log('\n=== WebSocket测试完成 ===');
            console.log('✅ WebSocket实时通知功能正常工作');
            ws1.close();
            ws2.close();
            process.exit(0);
        }
    });

    ws2.on('error', (error) => {
        console.error('❌ 张伟WebSocket连接错误:', error.message);
    });

    ws2.on('close', (code, reason) => {
        console.log(`🔌 张伟连接关闭: code=${code}, reason=${reason}\n`);
    });
}, 2000);

// 设置超时保护
setTimeout(() => {
    console.log('\n⏰ 测试超时（10秒）');
    ws1.close();
    process.exit(0);
}, 10000);
