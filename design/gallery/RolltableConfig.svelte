<script module>
  export const meta = {
    group: 'Windows',
    title: 'RolltableConfig',
    path: 'module/ui/settings/RolltableConfig.svelte',
    width: 800,
    note: 'The seven `table1e*` world settings, grouped and labelled the way the AppV1 template laid them out. `ROLLTABLE_GROUPS` is the single source both this markup and the submit handler read.',
  };
</script>

<script>
  import RolltableConfig from '../../module/ui/settings/RolltableConfig.svelte';
  import { ROLLTABLE_GROUPS } from '../../module/ui/settings/RolltableConfigApp.js';
  import { say } from './fixtures.js';

  const values = Object.fromEntries(
    ROLLTABLE_GROUPS.flatMap((group) =>
      group.fields.filter(Boolean).map((field) => [field.key, `mothershiprpg.${field.key}`]),
    ),
  );
</script>

<RolltableConfig app={{ close: say('close window') }} {values} />
