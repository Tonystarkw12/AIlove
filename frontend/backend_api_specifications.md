# AI 姻缘坊 - API 文档

## 概述

本项目旨在通过 AI 辅助的个性化推荐和实时聊天功能，帮助用户找到理想的伴侣。

**基础 URL**: `https://zkbdeainnjcy.sealoshzh.site/`

## 认证 (Authentication)

### 1. 用户注册

- **Endpoint**: `POST /auth/register`
- **请求体**:
  ```json
  {
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "password": "password123"
  }
  ```
- **成功响应 (201)**:
  ```json
  {
    "userId": "uuid-string",
    "token": "jwt-token-string",
    "message": "User registered successfully"
  }
  ```
- **错误响应**:
  - `400 Bad Request`: 输入无效 (例如，缺少字段，密码太短，邮箱格式错误)
    ```json
    { "error": { "code": "INVALID_INPUT", "message": "Nickname, email, and password are required." } }
    ```
  - `409 Conflict`: 邮箱或昵称已存在
    ```json
    { "error": { "code": "CONFLICT", "message": "Email already exists." } }
    ```
  - `500 Internal Server Error`: 服务器内部错误

### 2. 用户登录

- **Endpoint**: `POST /auth/login`
- **请求体**:
  ```json
  {
    "email": "zhangsan@example.com",
    "password": "password123"
  }
  ```
- **成功响应 (200)**:
  ```json
  {
    "token": "jwt-token-string",
    "userId": "uuid-string",
    "nickname": "张三",
    "message": "Login successful"
  }
  ```
- **错误响应**:
  - `400 Bad Request`: 输入无效
  - `401 Unauthorized`: 凭证无效
  - `500 Internal Server Error`

---

## 用户个人资料 (User Profile)

**认证**: 所有用户个人资料相关的端点都需要 JWT Bearer Token 在 `Authorization` header 中。

### 1. 获取自己的个人资料

- **Endpoint**: `GET /users/me/profile`
- **成功响应 (200)**:
  ```json
  {
    "user_id": "uuid-string",
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "gender": "男",
    "birth_date": "1990-01-01", // YYYY-MM-DD
    "height_cm": 175,
    "weight_kg": 70,
    "occupation": "工程师",
    "salary_range": "10k-20k",
    "orientation": "异性恋",
    "bio": "我是一个热爱生活的人...",
    "avatar_url": "/uploads/avatar.jpg",
    "location_geohash": "ws100",
    "location_latitude": 39.9,
    "location_longitude": 116.3,
    "preferred_age_min": 25,
    "preferred_age_max": 35,
    "preferred_gender": "女",
    "tags": ["徒步", "科幻电影", "撸猫"],
    "values_description": "我认为最重要的是真诚和共同成长。",
    "q_and_a": {
      "ideal_weekend": "安静地看书或者和朋友爬山。",
      "about_pets": "我非常喜欢狗，家里有一只金毛。"
    },
    "photos": [
      { "photo_id": "uuid-photo1", "url": "/uploads/photo1.jpg", "is_avatar": true },
      { "photo_id": "uuid-photo2", "url": "/uploads/photo2.jpg", "is_avatar": false }
    ]
  }
  ```
- **错误响应**:
  - `401 Unauthorized`: Token 无效或缺失
  - `404 Not Found`: 用户资料未找到
  - `500 Internal Server Error`

### 2. 更新自己的个人资料

- **Endpoint**: `PUT /users/me/profile`
- **请求体** (只包含需要更新的字段):
  ```json
  {
    "nickname": "张三丰",
    "bio": "更新后的简介...",
    "height_cm": 176,
    "tags": ["徒步", "科幻电影", "撸猫", "烹饪"],
    "q_and_a": {
      "ideal_weekend": "安静地看书或者和朋友爬山，有时也喜欢尝试新的烹饪食谱。",
      "about_pets": "我非常喜欢狗，家里有一只金毛。"
    }
    // ... 其他可更新字段
  }
  ```
- **成功响应 (200)**:
  ```json
  {
    "message": "Profile updated successfully",
    "updatedProfile": {
      // ... 更新后的完整个人资料 (格式同 GET /users/me/profile)
    }
  }
  ```
- **错误响应**:
  - `400 Bad Request`: 输入无效 (例如，日期格式错误，tags 不是数组)
  - `401 Unauthorized`
  - `409 Conflict`: 昵称已被其他用户占用
  - `500 Internal Server Error`

### 3. 获取其他用户的公开个人资料

- **Endpoint**: `GET /users/{userId}/profile`
- **成功响应 (200)** (只包含公开信息):
  ```json
  {
    "userId": "uuid-other-user",
    "nickname": "李四",
    "age": 30, // 根据 birth_date 计算
    "gender": "女",
    "occupation": "设计师",
    "bio": "热爱艺术和旅行...",
    "avatarUrl": "/uploads/other_avatar.jpg",
    "photos": [ // 只包含非头像的照片URL，或按需选择
      { "photoId": "uuid-photo-other1", "url": "/uploads/other_photo1.jpg", "isAvatar": false },
      { "photoId": "uuid-photo-other2", "url": "/uploads/other_photo2.jpg", "isAvatar": false }
    ],
    "tags": ["艺术", "旅行", "摄影"]
  }
  ```
- **错误响应**:
  - `401 Unauthorized`
  - `404 Not Found`: 用户资料未找到
  - `500 Internal Server Error`

### 4. 上传个人照片

- **Endpoint**: `POST /users/me/photos`
- **请求类型**: `multipart/form-data`
- **请求体**:
  - `photos`: 图片文件 (可多张，最多5张，每张最大5MB，支持jpg, jpeg, png, gif)
- **成功响应 (201)**:
  ```json
  {
    "message": "Photo(s) uploaded successfully",
    "uploadedPhotos": [
      { "photo_id": "uuid-new-photo1", "url": "/uploads/new_photo1.jpg", "is_avatar": false },
      { "photo_id": "uuid-new-photo2", "url": "/uploads/new_photo2.jpg", "is_avatar": false }
    ]
  }
  ```
- **错误响应**:
  - `400 Bad Request`: 无文件上传，文件类型不支持，文件过大
  - `401 Unauthorized`
  - `500 Internal Server Error`

### 5. 删除个人照片

- **Endpoint**: `DELETE /users/me/photos/{photoId}`
- **成功响应 (200)**:
  ```json
  {
    "message": "Photo deleted successfully"
  }
  ```
- **错误响应**:
  - `400 Bad Request`: photoId 格式无效
  - `401 Unauthorized`
  - `404 Not Found`: 照片未找到或不属于该用户
  - `500 Internal Server Error`

### 6. 设置头像

- **Endpoint**: `PUT /users/me/avatar`
- **请求体**:
  ```json
  {
    "photoId": "uuid-existing-photo-id"
  }
  ```
- **成功响应 (200)**:
  ```json
  {
    "message": "Avatar updated successfully",
    "avatarUrl": "/uploads/photo_that_became_avatar.jpg"
  }
  ```
- **错误响应**:
  - `400 Bad Request`: photoId 缺失或格式无效
  - `401 Unauthorized`
  - `404 Not Found`: 照片未找到或不属于该用户
  - `500 Internal Server Error`

---

## AI 推荐 (AI Recommendations)

**认证**: 需要 JWT Bearer Token。

### 1. 获取推荐用户列表

- **Endpoint**: `GET /recommendations`
- **查询参数**:
  - `limit` (可选, number, 默认 10): 每页返回数量
  - `offset` (可选, number, 默认 0): 偏移量
  - `filters` (可选, JSON string, 占位符): 未来可用于更高级的过滤，例如 `{"age_min": 25, "age_max": 30}`
- **成功响应 (200)**:
  ```json
  {
    "recommendations": [
      {
        "userId": "uuid-recommended-user1",
        "name": "推荐用户1",
        "age": 28,
        "occupation": "教师",
        "bio": "喜欢阅读和音乐...",
        "imageUrl": "/uploads/recommended1_avatar.jpg",
        "recommendationScore": 92, // AI 匹配分数
        "match_reason": "你们都喜欢阅读，并且对未来有相似的规划。",
        "icebreakers": [
          "最近在读什么有趣的书吗？",
          "你最喜欢的音乐类型是什么？",
          "如果可以去世界任何一个地方旅行，你会选择哪里？"
        ]
      },
      // ...更多推荐用户
    ],
    "totalCount": 50, // 总推荐数量
    "nextOffset": 10 // 下一页的偏移量，如果为 null 表示没有更多
  }
  ```
- **错误响应**:
  - `401 Unauthorized`
  - `500 Internal Server Error`

**注意**: 推荐列表会在用户注册或更新个人资料（特别是影响匹配的字段）后由后台异步更新。

---

## 实时聊天 (Real-time Chat)

聊天功能结合了 REST API (用于获取历史记录和作为 WebSocket 的备用发送方式) 和 WebSocket (用于实时消息传递)。

### WebSocket 连接

- **Endpoint**: `ws://<your-server-address>/ws/chat?token=<jwt-token>`
- **协议**: WebSocket (wss:// in production)
- **认证**: 通过 URL query parameter `token` 传递 JWT。
- **消息格式**: JSON
  - **客户端发送消息**:
    ```json
    {
      "type": "sendMessage",
      "payload": {
        "receiverId": "uuid-chat-partner-id",
        "content": "你好呀！"
      }
    }
    ```
  - **服务器推送新消息**:
    ```json
    {
      "type": "newMessage",
      "payload": {
        "messageId": "uuid-message-id",
        "senderId": "uuid-sender-id",
        "receiverId": "uuid-receiver-id",
        "content": "你好呀！",
        "timestamp": "2024-01-15T10:30:00.000Z"
        // "status": "sent" // or "delivered", "read" - 状态更新可通过单独的事件
      }
    }
    ```
  - **服务器错误消息**:
    ```json
    {
      "type": "error",
      "payload": {
        "message": "错误描述信息"
      }
    }
    ```
  - **(可选) 消息状态更新 (例如，标记为已读)**:
    - 客户端发送:
      ```json
      {
        "type": "markAsRead",
        "payload": { "messageIdToMark": "uuid-message-id" }
      }
      ```
    - 服务器推送给消息发送方:
      ```json
      {
        "type": "messageStatusUpdate",
        "payload": { "messageId": "uuid-message-id", "status": "read" }
      }
      ```

### REST API 端点

**认证**: 需要 JWT Bearer Token。

#### 1. 获取聊天记录

- **Endpoint**: `GET /chat/{chatPartnerId}/messages`
- **查询参数**:
  - `limit` (可选, number, 默认 50): 返回消息数量
  - `beforeTimestamp` (可选, ISO8601 string): 用于分页，获取此时间戳之前的消息
- **成功响应 (200)**:
  ```json
  {
    "messages": [
      {
        "messageId": "uuid-msg1",
        "senderId": "uuid-user-A",
        "receiverId": "uuid-user-B",
        "content": "你好！",
        "timestamp": "2024-01-15T10:00:00.000Z",
        "status": "read"
      },
      // ...更多消息，按时间倒序排列
    ]
  }
  ```
- **错误响应**:
  - `401 Unauthorized`
  - `404 Not Found`: 聊天伙伴不存在 (可选检查)
  - `500 Internal Server Error`

#### 2. 发送消息 (REST API - 作为 WebSocket 的备用或初始发送)

- **Endpoint**: `POST /chat/{chatPartnerId}/messages`
- **请求体**:
  ```json
  {
    "content": "通过 REST API 发送的消息！"
  }
  ```
- **成功响应 (201)**:
  ```json
  {
    "messageId": "uuid-new-msg",
    "senderId": "uuid-current-user",
    "receiverId": "uuid-chat-partner",
    "content": "通过 REST API 发送的消息！",
    "timestamp": "2024-01-15T10:05:00.000Z",
    "status": "sent"
  }
  ```

  **注意**: 如果接收方在线，此消息也会尝试通过 WebSocket 推送。
- **错误响应**:
  - `400 Bad Request`: 内容为空，或发送给自己
  - `401 Unauthorized`
  - `404 Not Found`: 接收方不存在
  - `500 Internal Server Error`

---

## 通用错误响应

- **`400 Bad Request`**: 请求无效，通常由于客户端输入错误。
  ```json
  { "error": { "code": "INVALID_INPUT", "message": "详细错误信息。" } }
  ```
- **`401 Unauthorized`**: 未提供有效认证凭证。
  ```json
  { "error": { "code": "UNAUTHORIZED", "message": "No token provided." / "Token has expired." } }
  ```
- **`403 Forbidden`**: 认证凭证有效，但无权访问该资源。
  ```json
  { "error": { "code": "FORBIDDEN", "message": "Token is not valid." / "Access denied." } }
  ```
- **`404 Not Found`**: 请求的资源不存在。
  ```json
  { "error": { "code": "NOT_FOUND", "message": "Resource not found." } }
  ```
- **`409 Conflict`**: 请求与当前资源状态冲突 (例如，创建已存在的唯一资源)。
  ```json
  { "error": { "code": "CONFLICT", "message": "Resource already exists." } }
  ```
- **`500 Internal Server Error`**: 服务器端发生未知错误。
  ```json
  { "error": { "code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred." } }
  ```
