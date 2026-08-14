// Which business has the payout account, and what do its transactions look like by status?
db.connected_accounts
  .find({ owner_type: 'business' })
  .toArray()
  .forEach((a) => {
    const biz = db.businesses.findOne({ _id: ObjectId(a.owner_id) });
    print('=== business: ' + (biz ? biz.name : '?') + ' (' + a.owner_id + ')');
    print('    stripe acct: ' + a.stripe_account_id + '  charges=' + a.charges_enabled + ' payouts=' + a.payouts_enabled);
    const txns = db.transactions.find({ counterparty_id: a.owner_id }).sort({ created_at: 1 }).toArray();
    print('    transactions: ' + txns.length);
    let net = 0;
    txns.forEach((t) => {
      const n = (t.fee_breakdown && t.fee_breakdown.counterparty_net_cents) || t.amount_cents - t.platform_fee_cents;
      if (t.status === 'completed') net += n;
      print(
        '      ' + t.status.padEnd(10) +
        ' gross=' + (t.amount_cents / 100).toFixed(2) +
        ' fee=' + (t.platform_fee_cents / 100).toFixed(2) +
        ' net=' + (n / 100).toFixed(2) +
        '  pi=' + (t.payment_intent_ref || 'none') +
        '  ' + (t.created_at ? t.created_at.toISOString().slice(0, 16) : '')
      );
    });
    print('    -> our "earned" (completed net only): ' + (net / 100).toFixed(2));
  });
