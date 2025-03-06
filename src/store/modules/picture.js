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
  async uploadImage({ dispatch, commit, state }, file) {
    try {
      console.log('picture/uploadImage - Начало загрузки файла:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const SERVER_URL = state.baseUrl;
      console.log('Отправка запроса на:', `${SERVER_URL}/upload`);
      
      const response = await axios.post(`${SERVER_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('picture/uploadImage - Полный ответ сервера:', response);
      console.log('picture/uploadImage - URL файла:', response.data.fileUrl);

      if (response.data.success && response.data.fileUrl) {
        const imageUrl = response.data.fileUrl;
        
        // Сохраняем URL в Firebase
        const userId = localStorage.getItem('userId') || 'default';
        const imagesRef = databaseRef(database, `users/${userId}/images`);
        const currentImages = (await get(imagesRef)).val() || [];
        
        // Добавляем новое изображение к существующим
        if (!currentImages.includes(imageUrl)) {
          currentImages.push(imageUrl);
          
          // Сохраняем обновленный список в Firebase
          await set(imagesRef, currentImages);
          
          // Обновляем store
          commit('ADD_IMAGE', imageUrl);
        }
        
        return imageUrl;
      } else {
        throw new Error('Не удалось получить URL изображения');
      }
    } catch (error) {
      console.error('picture/uploadImage - Ошибка загрузки:', error);
      throw error;
    }
  },

  async loadImagesFromFirebase({ commit }) {
    try {
      const userId = localStorage.getItem('userId') || 'default';
      const imagesRef = databaseRef(database, `users/${userId}/images`);
      const snapshot = await get(imagesRef);
      const images = snapshot.val() || [];
      
      console.log('Загружены изображения из Firebase:', images);
      console.log('Типы URL изображений:', images.map(url => ({ url, type: typeof url })));
      
      commit('SET_UPLOADED_IMAGES', images);
    } catch (error) {
      console.error('Ошибка при загрузке изображений из Firebase:', error);
    }
  },

  async uploadMultipleImages({ dispatch }, files) {
    const uploadPromises = files.map(file => dispatch('uploadImage', file));
    return Promise.all(uploadPromises);
  },

  async savePostImages({ commit }, { postId, images }) {
    try {
      commit('CLEAR_UPLOADED_IMAGES');
      images.forEach(imageUrl => {
        commit('ADD_IMAGE', imageUrl);
      });
      console.log('picture/savePostImages - Сохранение изображений для поста:', postId);
      
      // Сохраняем изображения в Firebase
      const imagesRef = databaseRef(database, `posts/${postId}/images`);
      await set(imagesRef, images);

      // Обновляем локальное состояние
      commit('SET_POST_IMAGES', { postId, images });
      
      console.log('picture/savePostImages - Изображения сохранены:', images);
      return images;
    } catch (error) {
      console.error('picture/savePostImages - Ошибка сохранения:', error);
      throw new Error('Не удалось сохранить изображения поста');
    }
  },

  async fetchPostImages({ commit }, postId) {
    try {
      console.log('picture/fetchPostImages - Загрузка изображений поста:', postId);
      
      // Получаем изображения из Firebase
      const imagesRef = databaseRef(database, `posts/${postId}/images`);
      const snapshot = await get(imagesRef);
      
      if (snapshot.exists()) {
        const images = snapshot.val();
        commit('SET_POST_IMAGES', { postId, images });
        console.log('picture/fetchPostImages - Изображения загружены:', images);
        return images;
      }
      
      return [];
    } catch (error) {
      console.error('picture/fetchPostImages - Ошибка загрузки:', error);
      throw new Error('Не удалось загрузить изображения поста');
    }
  },

  async removePostImage({ commit, state }, { postId, imageUrl }) {
    try {
      console.log('picture/removePostImage - Удаление изображения:', imageUrl);
      
      if (postId) {
        // Если есть postId, удаляем из Firebase
        const imagesRef = databaseRef(database, `posts/${postId}/images`);
        const snapshot = await get(imagesRef);
        
        if (snapshot.exists()) {
          const images = snapshot.val().filter(url => url !== imageUrl);
          await set(imagesRef, images);
          commit('SET_POST_IMAGES', { postId, images });
        }
      } else {
        // Если нет postId, удаляем из временного хранилища
        const newImages = state.uploadedImages.filter(url => url !== imageUrl);
        commit('SET_UPLOADED_IMAGES', newImages);
      }
      
      console.log('picture/removePostImage - Изображение удалено');
      return true;
    } catch (error) {
      console.error('picture/removePostImage - Ошибка удаления:', error);
      throw new Error('Не удалось удалить изображение');
    }
  },

  async removeImage({ commit }, index) {
    try {
      commit('REMOVE_IMAGE', index);
      return { success: true, message: 'Изображение успешно удалено' };
    } catch (error) {
      console.error('Ошибка при удалении изображения:', error);
      return { success: false, message: 'Ошибка при удалении изображения' };
    }
  },

  async convertToDataUrl({ state }, url) {
    try {
      const response = await axios.get(url, {
        responseType: 'blob'
      });
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(response.data);
      });
    } catch (error) {
      console.error('Ошибка при конвертации в data URL:', error);
      throw error;
    }
  },

  clearImages({ commit }) {
    commit('SET_UPLOADED_IMAGES', []);
  }
};

const getters = {
  getPostImages: (state) => (postId) => state.postImages[postId] || [],
  getUploadedImages: (state) => state.uploadedImages,
  getUploadProgress: (state) => (fileName) => state.uploadProgress[fileName] || 0,
  getSelectedImage: (state) => state.selectedImage,
  // Временно возвращаем оригинальный URL для отладки
  getImageUrl: (state) => (url) => {
    console.log('getImageUrl получил URL:', url);
    return url;
  }
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};