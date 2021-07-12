import axios from 'axios';
import { showAlert } from './alert';
export const updateData = async (data) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: '/api/v1/users/updateMe',
      data,
    });
    console.log(data);
    if (res.data.status === 'success') {
      showAlert('success', 'Data Updated successfully');
      window.setTimeout(() => {
        location.assign('/me');
      }, 1500);
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};

export const updatePassword = async (
  passwordCurrent,
  password,
  passwordConfirm
) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: '/api/v1/users/updateMyPassword',
      data: {
        passwordCurrent,
        password,
        passwordConfirm,
      },
    });
    if (res.data.status === 'success') {
      showAlert('success', ' Password Updated successfully');
      window.setTimeout(() => {
        location.assign('/me');
      }, 1500);
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};
