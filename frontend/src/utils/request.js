import { API_BASE_URL } from '../config';

const request = (options) => {
  const token = uni.getStorageSync('token');
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

export const uploadFile = (filePath, options = {}) => {
  const token = uni.getStorageSync('token');
  
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}${options.url}`,
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      formData: options.formData,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(res.data));
        } else {
          reject(res);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

export default request; 