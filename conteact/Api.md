*check_user_name*
get: /api/user/getUsersName
VO: <Set<String> user_names>

*creat_invite_code*
post: /api/user/creatInviteCode
DTO: CreatInviteCodeDTO
VO: <CreatInviteCodeVO>

*register*
post: /api/user/register
DTO: RegisterDTO
VO: <UserVO userVO>

*login*
post: /api/user/login
DTO: LoginDTO loginDTO
VO: <UserVO userVO>
