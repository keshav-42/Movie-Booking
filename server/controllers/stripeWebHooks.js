import stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../Inngest/index.js";

export const stripeWebHooks = async (request, response) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const sig = request.headers["stripe-signature"];

  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const sessionList = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntent.id,
        });

        const session = sessionList.data[0];

        const { bookingId } = session.metadata;

        const booking = await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: "",
        })

        //No booking means the seat-release job already cancelled it and the
        //seats are gone — this payment slipped through the narrow window where
        //Stripe was still processing it as we expired the session. We have the
        //customer's money and nothing to give them, so hand it straight back.
        //The idempotency key keeps Stripe's webhook retries from refunding twice.
        if (!booking) {
          console.error(
            `Orphan payment for cancelled booking ${bookingId} — refunding ${paymentIntent.id}`
          );

          try {
            await stripeInstance.refunds.create(
              { payment_intent: paymentIntent.id },
              { idempotencyKey: `refund_orphan_${paymentIntent.id}` }
            );
          } catch (error) {
            //Never swallow this one: money is stuck and needs a human.
            console.error(
              `REFUND FAILED for ${paymentIntent.id} (booking ${bookingId}) — refund manually:`,
              error.message
            );
          }

          break;
        }

        //Send Confirmation Email — best-effort, the payment is already recorded above.
        try {
          await inngest.send({
            name: 'app/show.booked',
            data: {bookingId}
          })
        } catch (error) {
          console.error('Inngest dispatch failed (show.booked):', error.message)
        }

        break;
      }

      default:
        console.log('Unhandled event type ', event.type)
    }

    response.json({received: true})
  } catch (error) {
    console.error('Webhook processing error: ', error)
    response.status(500).send('Internal Server Error')
  }
};
