import { Segmented } from 'antd';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { EmailTemplatesView } from '../components/email-templates-view';
import { NotificationQueueView } from '../components/notification-queue-view';
import {
  NOTIFICATION_TAB,
  NOTIFICATION_TAB_OPTIONS,
  NOTIFICATION_TABS,
  type NotificationTab,
} from '../constants/email-template.constants';

/**
 * "Thông báo email": hai màn con — hàng đợi gửi và mẫu email. Tab nằm trên URL (`?tab=templates`);
 * đổi tab thì bỏ các lọc của màn kia để URL không mang tham số vô nghĩa.
 */
export function NotificationsPage() {
  const url = useUrlFilters();
  const tab = url.getEnum('tab', NOTIFICATION_TABS) ?? NOTIFICATION_TAB.QUEUE;
  const switcher = (
    <Segmented<NotificationTab>
      value={tab}
      options={NOTIFICATION_TAB_OPTIONS}
      onChange={(next) =>
        url.patch({
          tab: next === NOTIFICATION_TAB.QUEUE ? undefined : next,
          q: undefined,
          status: undefined,
          page: undefined,
        })
      }
    />
  );
  return tab === NOTIFICATION_TAB.TEMPLATES ? (
    <EmailTemplatesView switcher={switcher} />
  ) : (
    <NotificationQueueView switcher={switcher} />
  );
}
