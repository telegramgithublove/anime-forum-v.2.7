import axios from 'axios';
import { ref as databaseRef, push, set, get, onValue, child } from 'firebase/database';
import { database } from '../../plugins/firebase';

export default {
  namespaced: true,
  state() {
    return {
      comments: [],
      isLoading: false,
      error: null
    };
  },
  mutations: {
    SET_COMMENTS(state, comments) {
      state.comments = comments;
    },
    ADD_COMMENT(state, comment) {
      state.comments.push(comment);
    },
    SET_LOADING(state, status) {
      state.isLoading = status;
    },
    SET_ERROR(state, error) {
      state.error = error;
    }
  },
  actions: {
    async fetchComments({ commit }, postId) {
      commit('SET_LOADING', true);
      try {
        const commentsRef = databaseRef(database, `posts/${postId}/comments`);
        
        // Устанавливаем слушатель для реального времени
        onValue(commentsRef, (snapshot) => {
          const comments = [];
          if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
              comments.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
              });
            });
          }
          commit('SET_COMMENTS', comments);
        });

      } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        commit('SET_ERROR', error.message);
      } finally {
        commit('SET_LOADING', false);
      }
    },

    async addComment({ commit, rootState }, { postId, content }) {
      try {
        const currentUser = rootState.auth.user;
        if (!currentUser) {
          throw new Error('Пользалуйста, войдите в систему');
        }

        // Получаем данные профиля пользователя
        const userProfileRef = databaseRef(database, `users/${currentUser.uid}/profile`);
        const userProfileSnapshot = await get(userProfileRef);
        const userProfile = userProfileSnapshot.val() || {};

        const newComment = {
          content,
          author: {
            uid: currentUser.uid,
            username: userProfile.username || 'Гость',
            avatarUrl: userProfile.avatarUrl || '/image/empty_avatar.png',
            signature: userProfile.signature || 'Участник форума'
          },
          createdAt: new Date().toISOString(),
          likes: 0,
          replies: []
        };

        // Создаем новый комментарий в Firebase
        const commentsRef = databaseRef(database, `posts/${postId}/comments`);
        const newCommentRef = push(commentsRef);
        await set(newCommentRef, newComment);

        // Комментарий автоматически добавится через слушатель onValue

        return { success: true };
      } catch (error) {
        console.error('Ошибка при добавлении комментария:', error);
        commit('SET_ERROR', error.message);
        return { success: false, error: error.message };
      }
    }
  },
  getters: {
    getComments: state => state.comments,
    isLoading: state => state.isLoading,
    hasError: state => state.error !== null,
    getError: state => state.error
  }
};
