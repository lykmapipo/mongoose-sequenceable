import { connect, Schema, model } from '@lykmapipo/mongoose-common';
import '../src';

const Ticket = model(
  'Ticket',
  new Schema({
    customer: { type: String, required: true },
    number: { type: String, required: true, sequenceable: true },
  })
);

connect(() => {
  Ticket.create({ customer: 'Joe Doe' }, (error, ticket) => {
    console.log(error, ticket);
  });
});
