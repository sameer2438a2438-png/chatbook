from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_, select

from ..deps import CurrentUser, DbDep
from ..models import User,LoginLog
from ..schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api", tags=["auth"])


def _token_for(user: User) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(str(user.id)), user=UserResponse.model_validate(user))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbDep):
    email = payload.email.lower().strip()
    existing = db.execute(
        select(User).where(or_(User.email == email, User.username == payload.username))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already registered")

    user = User(
        email=email,
        username=payload.username.strip(),
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_for(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbDep):
    email = payload.email.lower().strip()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    db.add(LoginLog(user_id=user.id))
    db.commit()
    return _token_for(user)


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser):
    return UserResponse.model_validate(user)
@router.get('/me', response_model=UserResponse)
def me(user: CurrentUser):
    return UserResponse.model_validate(user)


@router.get('/users')
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            'id': u.id,
            'name': u.name,
            'email': u.email
        }
        for u in users
    ]