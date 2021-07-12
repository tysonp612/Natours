import axios from 'axios';
import { showAlert } from './alert';
export const bookTour = async (id) => {
  try {
    const stripe = Stripe(
      'pk_test_51JBo6VIohjXgxaSFxH9PE1jlKqkYJKn469iZZcpVxlaXZyR60tL5xKcqEBSO3Pp2hPoH8zuRYNQ4pOBRwPWcvX0500lxat7i3f'
    ); //1 Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:8000/api/v1/bookings/checkout-session/${id}`
    );
    console.log(session);
    //2 Create a checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert('error', err);
  }
};
