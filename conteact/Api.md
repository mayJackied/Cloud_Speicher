*frp Adresse*
8.130.215.175:8080

User {

*check_user_name*
get: /api/user/getUsersName
VO: <Set<String> user_names>
no JWT

*creat_invite_code*
post: /api/user/creatInviteCode
DTO: CreatInviteCodeDTO
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

*get_public_documents*
get:


}