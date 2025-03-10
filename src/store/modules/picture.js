import axios from 'axios';
import { ref as databaseRef, set, get } from 'firebase/database';
import { database } from '../../plugins/firebase';
import imageCompression from 'browser-image-compression';

const state = {
  postImages: {},
  uploadedImages: [],
  uploadProgress: {},
  selectedImage: null,
  baseUrl: 'http://95.164.90.115:3000'
};

const mutations = {
  SET_POST_IMAGES(state, { postId, images }) {
    state.postImages[postId] = images;
  },
  ADD_IMAGE(state, imageUrl) {
    if (!state.uploadedImages.includes(imageUrl)) {
      state.uploadedImages.push(imageUrl);
    }
  },
  SET_UPLOADED_IMAGES(state, images) {
    state.uploadedImages = Array.isArray(images) ? images : [];
    console.log('Обновлен список изображений:', state.uploadedImages);
  },
  SET_UPLOAD_PROGRESS(state, { fileName, progress }) {
    state.uploadProgress[fileName] = progress;
  },
  REMOVE_IMAGE(state, index) {
    state.uploadedImages.splice(index, 1);
  },
  CLEAR_UPLOADED_IMAGES(state) {
    state.uploadedImages = [];
    state.uploadProgress = {};
  },
  setSelectedImage(state, image) {
    state.selectedImage = image;
  }
};

const actions = {
  async uploadImage({ dispatch, commit, state }, { file, type = 'post' }) {
    try {
      console.log(`picture/uploadImage - Начало загрузки файла (${type}):`, file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${state.baseUrl}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success && response.data.fileUrl) {
        // Формируем полный URL из baseUrl и относительного пути
        const relativePath = response.data.fileUrl;
        const imageUrl = `${state.baseUrl}${relativePath.startsWith('/') ? relativePath : '/' + relativePath}`;
        console.log('Полный URL изображения:', imageUrl); // Для отладки

        const userId = localStorage.getItem('userId') || 'default';
        let imagesRef;

        if (type === 'comment') {
          imagesRef = databaseRef(database, `users/${userId}/commentImages`);
        } else {
          imagesRef = databaseRef(database, `users/${userId}/images`);
        }

        const currentImages = (await get(imagesRef)).val() || [];
        if (!currentImages.includes(imageUrl)) {
          currentImages.push(imageUrl);
          await set(imagesRef, currentImages);
        }

        commit('ADD_IMAGE', imageUrl);
        return imageUrl;
      } else {
        throw new Error('Не удалось получить URL изображения');
      }
    } catch (error) {
      console.error(`picture/uploadImage (${type}) - Ошибка загрузки:`, error);
      throw error;
    }
  },
};

const getters = {
  getPostImages: (state) => (postId) => state.postImages[postId] || [],
  getUploadedImages: (state) => state.uploadedImages,
  getUploadProgress: (state) => (fileName) => state.uploadProgress[fileName] || 0,
  getSelectedImage: (state) => state.selectedImage,
  getImageUrl: (state) => (url) => url
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};