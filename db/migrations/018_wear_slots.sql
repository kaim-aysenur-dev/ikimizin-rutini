-- Gelişim: giyim yuvaları. Göğüs zırhının yanında kask, kalkan, pelerin, eldiven, çizme ve takı ayrı kuşanılır.
alter table equipment add column if not exists helmet text check (helmet is null or char_length(helmet) between 1 and 60);
alter table equipment add column if not exists shield text check (shield is null or char_length(shield) between 1 and 60);
alter table equipment add column if not exists cape text check (cape is null or char_length(cape) between 1 and 60);
alter table equipment add column if not exists gloves text check (gloves is null or char_length(gloves) between 1 and 60);
alter table equipment add column if not exists boots text check (boots is null or char_length(boots) between 1 and 60);
alter table equipment add column if not exists trinket text check (trinket is null or char_length(trinket) between 1 and 60);

-- Önceden göğüs yuvasında duran miğfer ve kalkan kendi yuvalarına taşınır (kuşanılanlar kaybolmaz)
update equipment set helmet = armor, armor = null where armor like 'migfer-%';
update equipment set shield = armor, armor = null where armor like 'kalkan-%';
