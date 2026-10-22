"""Exercise delivery iteration without contacting a mail provider."""
import os
import unittest
from unittest.mock import patch
from scripts import send_newsletter as sender


class DeliveryChecks(unittest.TestCase):
    def test_unsubscribing_does_not_skip_next_audience_page(self):
        members = [{'user_id': f'{n:04}', 'email': f'{n}@example.invalid',
                    'unsubscribe_token': f'token-{n}'} for n in range(1, 102)]
        delivered = []
        pages = []

        def request(url, method='GET', data=None, headers=None):
            if url == 'https://api.resend.com/emails':
                delivered.extend(data['to'])
                return {'id': 'fixture-message'}
            path = url.split('/rest/v1/')[1]
            if path.startswith('pr_issues?'):
                return [{'status': 'approved', 'subject': 'Fixture', 'content': {}}]
            if path.startswith('pr_subscriptions?state=eq.active'):
                pages.append(path)
                # An earlier recipient unsubscribes while the first page is sent.
                active = members if len(pages) == 1 else members[1:]
                after = path.split('user_id=gt.')[1] if 'user_id=gt.' in path else ''
                return [m for m in active if m['user_id'] > after][:100]
            if path.startswith('pr_subscriptions?user_id=eq.'):
                return [{'state': 'active'}]
            if path.startswith('pr_deliveries?') and method == 'GET':
                return []
            return None

        settings = dict(NEWSLETTER_SEND_ENABLED='true', SUPABASE_URL='https://fixture.invalid',
                        SUPABASE_SERVICE_ROLE_KEY='fixture', RESEND_API_KEY='fixture',
                        NEWSLETTER_FROM='fixture@example.invalid', PR_DOMAIN='https://fixture.invalid')
        with patch.dict(os.environ, settings), patch('sys.argv', ['sender', '--issue', 'fixture', '--send']), \
                patch.object(sender, 'request', side_effect=request), patch.object(sender, 'render', return_value='Fixture'), \
                patch('builtins.print'):
            sender.main()
        self.assertEqual(len(delivered), 101)
        self.assertEqual(len(set(delivered)), 101)
        self.assertTrue(all('offset=' not in path for path in pages))

    def test_delivery_stays_off_without_explicit_send_flag(self):
        with patch('sys.argv', ['sender', '--issue', 'fixture']), \
                patch.object(sender, 'request') as request, patch('builtins.print'):
            sender.main()
        request.assert_not_called()


if __name__ == '__main__':
    unittest.main()
