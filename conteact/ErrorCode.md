1.... User
2.... File

|  Code | Name                         | Description               |
|------:|------------------------------|---------------------------|
| 99999 | EXCEPTION                    | 后端处理错误                    |
|       |                              |                           |
| 10000 | NOT_LOGIN                    | 没有登录                      | 
| 10001 | USER_NOT_FOUND               | 没有此账号                     |       
| 10002 | NOT_ADMIN                    | 您不是管理员                    |       
| 10003 | USERNAME_EMPTY               | 用户名不能为空                   |       
| 10004 | USERNAME_LENGTH_INVALID      | 用户名长度必须为3-20位             |       
| 10005 | USERNAME_FORMAT_INVALID      | 用户名必须以字母开头，且只能包含字母、数字和下划线 |       
| 10006 | PASSWORD_EMPTY               | 密码不能为空                    |       
| 10007 | PASSWORD_LENGTH_INVALID      | 密码长度必须为8-64位              |       
| 10008 | PASSWORD_FORMAT_INVALID      | 密码必须同时包含字母和数字，且只能包含字母和数字  |       
| 10009 | INVITE_CODE_EMPTY            | 邀请码不能为空                   |       
| 10010 | INVITE_CODE_INVALID          | 无效的邀请码                    |       
| 10011 | USERNAME_OR_PASSWORD_INVALID | 用户名或密码不正确                 |      
| 10012 | DELETE_USER_FAILED           | 删除用户失败                    |       
| 10013 | BLACKLISTED_JWT              | JWT 已作废                   |
|       |                              |                           |
| 20001 | NO_PERMISSION                | 您没有权限操作此文件                |       
| 20002 | FILE_OPERATION_FAILED        | 文件操作失败                    |
| 20003 | FILE_NAME_ILLEGAL            | 文件名不合法                    |
| 20004 | FILE_NOT_FOUND               | 文件不存在                     |
| 20005 | FILE_ILLEGAL                 | 文件不符合约定                   |
| 20006 | FILE_DUPLICATE               | 存在同名文件                    |


