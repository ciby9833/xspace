登录后这个用户是拥有订单管理的权限，没有其他的权限，但是用订单管理的功能会出现如下问题：
 尝试登录用户: xavier.c@admin.com   密码：password
🔍 查询结果: 找到用户 XavierC
🔍 验证密码...
🔍 密码验证结果: 正确
🔑 用户角色: S02
🔑 账户级别: store (来自数据库)
🔑 账号状态: 激活
🔑 获取到权限: [
  'order.manage',
  'order.delete',
  'order.view',
  'order.assign',
  'order.create',
  'order.edit'
]

一、登录api：
Request URL
http://localhost:3000/api/auth/login
Request Method
POST
Status Code
200 OK
返回：
{
    "success": true,
    "message": "登录成功",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZmRmMmY1NzAtMWRiYS00MjAwLWEwMTMtYzNmYWVmZGZkNWZiIiwicm9sZV9pZCI6ImEzMWQ1OTViLWMxOTYtNDBiMS1iNjU1LWZkZjk2YjFiZDM1MSIsInJvbGVfbmFtZSI6IlMwMiIsImFjY291bnRfbGV2ZWwiOiJzdG9yZSIsImNvbXBhbnlfaWQiOiI1ZDgzNDVlYi1iMGU1LTRiNDEtYTgxZi0yN2E2ZDJjODk2NzUiLCJzdG9yZV9pZCI6IjE4NGUxYzNlLTRkNzEtNGM1YS05ZGM3LTQ5NDI4ZDA2Zjc1YiIsInBlcm1pc3Npb25zIjpbIm9yZGVyLm1hbmFnZSIsIm9yZGVyLmRlbGV0ZSIsIm9yZGVyLnZpZXciLCJvcmRlci5hc3NpZ24iLCJvcmRlci5jcmVhdGUiLCJvcmRlci5lZGl0Il0sImRhdGFfc2NvcGUiOiJzdG9yZSIsImlhdCI6MTc1MDUwMDE3MiwiZXhwIjoxNzUwNTg2NTcyfQ.4ZrVe3Z9r9du0tDzZqzYg8MjVmFZt0XWxZya-NlpFiw",
    "user": {
        "id": "fdf2f570-1dba-4200-a013-c3faefdfd5fb",
        "name": "XavierC",
        "email": "xavier.c@admin.com",
        "phone": null,
        "role_id": "a31d595b-c196-40b1-b655-fdf96b1bd351",
        "role_name": "S02",
        "role_display_name": "订单",
        "account_level": "store",
        "company_id": "5d8345eb-b0e5-4b41-a81f-27a6d2c89675",
        "company_name": "Xspace",
        "store_id": "184e1c3e-4d71-4c5a-9dc7-49428d06f75b",
        "store_name": "Landamrk",
        "stores": [
            {
                "id": "184e1c3e-4d71-4c5a-9dc7-49428d06f75b",
                "name": "Landamrk",
                "is_primary": true
            }
        ],
        "last_login_at": "2025-06-21T10:01:38.464Z",
        "is_active": true,
        "permissions": [
            "order.manage",
            "order.delete",
            "order.view",
            "order.assign",
            "order.create",
            "order.edit"
        ],
        "data_scope": "store"
    },
    "timestamp": "2025-06-21T10:02:52.449Z"
}

二、订单管理
请求了四个api：
1、Request URL
http://localhost:3000/api/order/available-stores
Request Method
    "success": true,
    "message": "获取可选门店列表成功",
    "data": [
        {
            "id": "184e1c3e-4d71-4c5a-9dc7-49428d06f75b",
            "company_id": "5d8345eb-b0e5-4b41-a81f-27a6d2c89675",
            "name": "Landamrk",
            "address": "L12 B9 Landmark Pluit Jakarta Utara DKI Jakarta",
            "business_hours": null,
            "is_active": true,
            "created_at": "2025-06-21T06:42:42.734Z",
            "updated_at": "2025-06-21T06:42:42.734Z",
            "timezone": "Asia/Jakarta",
            "company_name": "Xspace",
            "company_type": "直营",
            "room_count": "6",
            "active_room_count": "6"
        }
    ],
    "timestamp": "2025-06-21T10:04:31.818Z"
}
2、Request URL
http://localhost:3000/api/order?page=1&pageSize=20
Request Method
{
    "success": true,
    "message": "获取订单列表成功",
    "data": [
        {
            "id": "fb03891b-55fa-41d4-a726-aca8e653edf5",
            "company_id": "5d8345eb-b0e5-4b41-a81f-27a6d2c89675",
            "store_id": "184e1c3e-4d71-4c5a-9dc7-49428d06f75b",
            "room_id": "a945d4e4-59dd-4e55-8634-76c088e5e121",
            "order_type": "密室",
            "order_date": "2025-06-21T17:00:00.000Z",
            "weekday": "周日",
            "language": "EN",
            "start_time": "09:00:00",
            "end_time": "13:30:00",
            "duration": 270,
            "customer_name": "Xavier Wu",
            "customer_phone": null,
            "player_count": 13,
            "internal_support": null,
            "script_id": null,
            "script_name": null,
            "game_host_id": "cdae3e87-e1fe-4f98-bb1d-14954d2473f3",
            "npc_id": null,
            "escape_room_id": "50d9b2ed-7b6d-48bc-a3b7-c08496241a64",
            "escape_room_name": "Paradise Asylum",
            "is_group_booking": null,
            "include_photos": null,
            "include_cctv": null,
            "booking_type": "Walk In",
            "is_free": false,
            "unit_price": "699000.00",
            "total_amount": "699000.00",
            "payment_status": "DP",
            "payment_date": null,
            "payment_method": "QR BCA",
            "promo_code": null,
            "promo_quantity": null,
            "promo_discount": null,
            "pic_id": "cdae3e87-e1fe-4f98-bb1d-14954d2473f3",
            "pic_payment_id": null,
            "notes": "全款已付",
            "status": "completed",
            "is_active": true,
            "created_at": "2025-06-21T09:34:52.911Z",
            "updated_at": "2025-06-21T09:52:10.761Z",
            "created_by": "44cee13e-9ea3-449e-9e01-7278325502aa",
            "updated_by": "cdae3e87-e1fe-4f98-bb1d-14954d2473f3",
            "pic_payment": null,
            "support_player_count": 0,
            "actual_start_time": "2025-06-21T09:51:49.520Z",
            "actual_end_time": "2025-06-21T09:52:10.761Z",
            "game_host_notes": "游戏顺利完成，客户体验很好",
            "company_name": "Xspace",
            "store_name": "Landamrk",
            "room_name": "Phoenix Space",
            "game_host_name": "XavierB",
            "npc_name": null,
            "pic_name": "XavierB",
            "pic_payment_name": null,
            "created_by_name": "xavierA",
            "updated_by_name": "XavierB",
            "images": [
                {
                    "id": "d980ae9d-4d86-4e18-94e8-d815fb00da30",
                    "image_url": "/uploads/orders/order-1750498492899-85dd4c2b-d776-486a-9322-419d9e206e97.jpeg",
                    "image_name": "33c45791-60fd-4ac1-82b7-63a88dd870b1.jpeg",
                    "image_type": "proof",
                    "sort_order": 0
                }
            ]
        },
        {
            "id": "ee9a635b-c2f9-49af-84eb-b506f614fba2",
            "company_id": "5d8345eb-b0e5-4b41-a81f-27a6d2c89675",
            "store_id": "184e1c3e-4d71-4c5a-9dc7-49428d06f75b",
            "room_id": "58726bf7-431f-4aa1-91ce-f07440b31f70",
            "order_type": "剧本杀",
            "order_date": "2025-06-20T17:00:00.000Z",
            "weekday": "周六",
            "language": "CN",
            "start_time": "17:00:00",
            "end_time": "19:00:00",
            "duration": 120,
            "customer_name": "XXX",
            "customer_phone": null,
            "player_count": 7,
            "internal_support": null,
            "script_id": "88904152-cc40-48fd-aeb6-601588aebd0b",
            "script_name": "Life Lottery",
            "game_host_id": "cdae3e87-e1fe-4f98-bb1d-14954d2473f3",
            "npc_id": null,
            "escape_room_id": null,
            "escape_room_name": null,
            "is_group_booking": null,
            "include_photos": null,
            "include_cctv": null,
            "booking_type": "Walk In",
            "is_free": false,
            "unit_price": "100000.00",
            "total_amount": "100000.00",
            "payment_status": "Not Yet",
            "payment_date": null,
            "payment_method": "DEBIT",
            "promo_code": null,
            "promo_quantity": null,
            "promo_discount": null,
            "pic_id": "cdae3e87-e1fe-4f98-bb1d-14954d2473f3",
            "pic_payment_id": null,
            "notes": "哈哈哈",
            "status": "in_progress",
            "is_active": true,
            "created_at": "2025-06-21T09:55:22.306Z",
            "updated_at": "2025-06-21T09:55:36.378Z",
            "created_by": "12777226-2023-4331-9d6c-f31966971901",
            "updated_by": "cdae3e87-e1fe-4f98-bb1d-14954d2473f3",
            "pic_payment": null,
            "support_player_count": 0,
            "actual_start_time": "2025-06-21T09:55:36.378Z",
            "actual_end_time": null,
            "game_host_notes": null,
            "company_name": "Xspace",
            "store_name": "Landamrk",
            "room_name": "Royal Space",
            "game_host_name": "XavierB",
            "npc_name": null,
            "pic_name": "XavierB",
            "pic_payment_name": null,
            "created_by_name": "Leo",
            "updated_by_name": "XavierB",
            "images": [
                {
                    "id": "4406236a-d5e5-4fc2-93d7-97ada47ee2b7",
                    "image_url": "/uploads/orders/order-1750499722288-6c3467f1-3172-4e1c-903b-47e2c67f0deb.jpg",
                    "image_name": "chips-8.jpg",
                    "image_type": "proof",
                    "sort_order": 0
                }
            ]
        },
        {
            "id": "22b927df-c027-428f-b222-0afc729b62a6",
            "company_id": "5d8345eb-b0e5-4b41-a81f-27a6d2c89675",
            "store_id": "184e1c3e-4d71-4c5a-9dc7-49428d06f75b",
            "room_id": "4404b7a5-7bb0-4973-bd4a-4792b9612481",
            "order_type": "剧本杀",
            "order_date": "2025-06-20T17:00:00.000Z",
            "weekday": "周六",
            "language": "IND",
            "start_time": "17:00:00",
            "end_time": "19:30:00",
            "duration": 150,
            "customer_name": "Alex ",
            "customer_phone": "081319039501",
            "player_count": 10,
            "internal_support": null,
            "script_id": "4f5146f2-6c83-411f-b37b-cdcf7b9d5b95",
            "script_name": "Snowfalls Echoes",
            "game_host_id": "44cee13e-9ea3-449e-9e01-7278325502aa",
            "npc_id": null,
            "escape_room_id": null,
            "escape_room_name": null,
            "is_group_booking": null,
            "include_photos": null,
            "include_cctv": null,
            "booking_type": "Booking",
            "is_free": false,
            "unit_price": "310000.00",
            "total_amount": "310000.00",
            "payment_status": "Not Yet",
            "payment_date": null,
            "payment_method": "Bank Transfer",
            "promo_code": null,
            "promo_quantity": null,
            "promo_discount": null,
            "pic_id": "44cee13e-9ea3-449e-9e01-7278325502aa",
            "pic_payment_id": null,
            "notes": "已经全款",
            "status": "in_progress",
            "is_active": true,
            "created_at": "2025-06-21T09:32:27.345Z",
            "updated_at": "2025-06-21T09:33:08.984Z",
            "created_by": "445ff2c3-d677-4feb-97bb-730ce694e85f",
            "updated_by": "44cee13e-9ea3-449e-9e01-7278325502aa",
            "pic_payment": null,
            "support_player_count": 0,
            "actual_start_time": "2025-06-21T09:33:08.984Z",
            "actual_end_time": null,
            "game_host_notes": null,
            "company_name": "Xspace",
            "store_name": "Landamrk",
            "room_name": "Infinity Space",
            "game_host_name": "xavierA",
            "npc_name": null,
            "pic_name": "xavierA",
            "pic_payment_name": null,
            "created_by_name": "Niko",
            "updated_by_name": "xavierA",
            "images": [
                {
                    "id": "517fbf40-de39-4829-9b1b-2942fdd20fd0",
                    "image_url": "/uploads/orders/order-1750498347330-895adc30-3cc5-4aa9-b5a2-5c36022037fc.png",
                    "image_name": "200748443905_1.png",
                    "image_type": "proof",
                    "sort_order": 0
                }
            ]
        }
    ],
    "timestamp": "2025-06-21T10:04:31.829Z"
}
3、Request URL
http://localhost:3000/api/stores
Request Method
{"success":false,"error":"权限不足：无法查看门店信息","timestamp":"2025-06-21T10:04:31.811Z"}
4、Request URL
http://localhost:3000/api/order/store/184e1c3e-4d71-4c5a-9dc7-49428d06f75b/resources
Request Method
{"success":false,"error":"获取门店资源失败","timestamp":"2025-06-21T10:04:31.828Z"}


注意：如果用户有更多权限则不会出现上述问题，但是我只要求用户有订单管理，那么他就不应该受到其他权限的限制；这个问题请认真排查并处理目前的权限结构上的异常；