create table phone_data
(
  id        bigint auto_increment
        primary key,
  phone     int                                 not null,
  pt        varchar(255)                        null,
  xmid      varchar(255)                        null,
  status    int                                 not null,
  reason    varchar(255)                        null,
  create_at timestamp default CURRENT_TIMESTAMP null,
  update_at timestamp default CURRENT_TIMESTAMP null
);

create index phone_data_phone_index
  on phone_data (phone);

create table system_config
(
  id          bigint auto_increment
        primary key,
  config_name varchar(255) null,
  config      json         null
);

