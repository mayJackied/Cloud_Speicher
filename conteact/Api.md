*frp Adresse*
8.130.215.175:8080

User {

*check_user_name*
get: /api/user/getUsersName
VO: <Set<String> user_names>
no JWT

*creat_invite_code*
get: /api/user/creatInviteCode
VO: <CreatInviteCodeVO>

*register*
post: /api/user/register
DTO: RegisterDTO
VO: <LoginVO loginVO >
no JWT

*login*
post: /api/user/login
DTO: LoginDTO loginDTO
VO: <LoginVO loginVO >
no JWT

}

File {

*get_files*
get: /api/file/getFiles
VO: <List<MyFile> myFiles>

}