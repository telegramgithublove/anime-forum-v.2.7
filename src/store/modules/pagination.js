import axios from 'axios';

export default {
  namespaced: true,
  state() {
    return {
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 0
    };
  },
  mutations: {
    SET_CURRENT_PAGE(state, page) {
      state.currentPage = page;
    },
    SET_ITEMS_PER_PAGE(state, count) {
      state.itemsPerPage = count;
    },
    SET_TOTAL_ITEMS(state, total) {
      state.totalItems = total;
    }
  },
  actions: {
    setCurrentPage({ commit }, page) {
      commit('SET_CURRENT_PAGE', page);
    },
    setItemsPerPage({ commit }, count) {
      commit('SET_ITEMS_PER_PAGE', count);
    },
    setTotalItems({ commit }, total) {
      commit('SET_TOTAL_ITEMS', total);
    }
  },
  getters: {
    getCurrentPage: state => state.currentPage,
    getItemsPerPage: state => state.itemsPerPage,
    getTotalItems: state => state.totalItems,
    getTotalPages: state => Math.ceil(state.totalItems / state.itemsPerPage),
    getPagedItems: state => items => {
      const start = (state.currentPage - 1) * state.itemsPerPage;
      const end = start + state.itemsPerPage;
      return items.slice(start, end);
    }
  }
};
