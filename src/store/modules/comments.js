import { ref as databaseRef, push, set, get, onValue, update } from 'firebase/database';
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
          throw new Error('Пожалуйста, войдите в систему');
        }

        const userProfileRef = databaseRef(database, `users/${currentUser.uid}/profile`);
        const userProfileSnapshot = await get(userProfileRef);
        const userProfile = userProfileSnapshot.val() || {};

        const newComment = {
          content,
          author: {
            uid: currentUser.uid,
            username: userProfile.username || 'Guest',
            avatarUrl: userProfile.avatarUrl || '/image/empty_avatar.png',
            signature: userProfile.signature || 'New User'
          },
          createdAt: new Date().toISOString(),
          likes: 0,
          likedBy: [], // Инициализируем массив для отслеживания лайков
          replies: []
        };

        const commentsRef = databaseRef(database, `posts/${postId}/comments`);
        const newCommentRef = push(commentsRef);
        await set(newCommentRef, newComment);

        return { success: true };
      } catch (error) {
        console.error('Ошибка при добавлении комментария:', error);
        commit('SET_ERROR', error.message);
        return { success: false, error: error.message };
      }
    },

    async likeComment({ commit, rootState }, { postId, commentId }) {
      try {
        const currentUser = rootState.auth.user;
        if (!currentUser) {
          throw new Error('Пожалуйста, войдите в систему, чтобы ставить лайки');
        }

        const commentRef = databaseRef(database, `posts/${postId}/comments/${commentId}`);
        const snapshot = await get(commentRef);
        if (!snapshot.exists()) {
          throw new Error('Комментарий не найден');
        }

        const commentData = snapshot.val();
        const currentLikes = commentData.likes || 0;
        const likedBy = commentData.likedBy || [];
        const userId = currentUser.uid;

        // Проверяем, лайкал ли пользователь уже этот комментарий
        const hasLiked = likedBy.includes(userId);
        let updates = {};

        if (hasLiked) {
          // Убираем лайк
          updates = {
            likes: currentLikes - 1,
            likedBy: likedBy.filter(id => id !== userId)
          };
        } else {
          // Добавляем лайк
          updates = {
            likes: currentLikes + 1,
            likedBy: [...likedBy, userId]
          };
        }

        // Обновляем данные в Firebase
        await update(commentRef, updates);

        return { success: true };
      } catch (error) {
        console.error('Ошибка при обновлении лайка:', error);
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