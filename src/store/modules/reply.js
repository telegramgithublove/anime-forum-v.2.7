import axios from 'axios';

const state = {
  replies: [],
  loading: false,
  error: null
};

const mutations = {
  SET_REPLIES(state, replies) {
    state.replies = replies;
  },
  ADD_REPLY(state, reply) {
    state.replies.push(reply);
  },
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  SET_ERROR(state, error) {
    state.error = error;
  }
};

const actions = {
  // Добавление нового ответа
  async addReply({ commit }, { topicId, content, userId, username, userAvatar }) {
    try {
      commit('SET_LOADING', true);
      const replyData = {
        topicId,
        content,
        userId,
        username,
        userAvatar,
        createdAt: new Date().toISOString()
      };

      const response = await axios.post('/api/replies', replyData);
      commit('ADD_REPLY', response.data);
      commit('SET_LOADING', false);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message);
      commit('SET_LOADING', false);
      throw error;
    }
  },

  // Загрузка ответов для темы
  async fetchRepliesByTopicId({ commit, dispatch }, topicId) {
    try {
      commit('SET_LOADING', true);
      const response = await axios.get(`/api/replies/${topicId}`);
      
      // Получаем профили пользователей для каждого ответа
      const repliesWithProfiles = await Promise.all(
        response.data.map(async (reply) => {
          try {
            // Получаем профиль пользователя
            const profileResponse = await axios.get(`${process.env.VUE_APP_API_URL}/users/${reply.userId}/profile`);
            
            return {
              ...reply,
              username: profileResponse.data?.username || 'Гость',
              userAvatar: profileResponse.data?.avatarUrl || '/image/empty_avatar.png',
            };
          } catch (error) {
            console.error('Error fetching user profile:', error);
            return {
              ...reply,
              username: 'Гость',
              userAvatar: '/image/empty_avatar.png',
            };
          }
        })
      );

      commit('SET_REPLIES', repliesWithProfiles);
      commit('SET_LOADING', false);
    } catch (error) {
      commit('SET_ERROR', error.message);
      commit('SET_LOADING', false);
      throw error;
    }
  }
};

const getters = {
  getReplies: state => state.replies,
  isLoading: state => state.loading,
  getError: state => state.error
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
